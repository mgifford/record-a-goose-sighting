/**
 * A small JSON Schema (draft 2020-12 subset) validator.
 *
 * The repository deliberately has no runtime dependency on a schema library:
 * the defect registry is validated during the build and in CI, so an
 * in-repository validator keeps `npm run defects:validate` reproducible
 * without installing anything beyond the existing dependencies.
 *
 * Supported keywords: $ref (local), $defs, const, enum, type, required,
 * properties, additionalProperties, propertyNames, items, minItems,
 * maxItems, uniqueItems, minLength, maxLength, pattern, format (date,
 * date-time, uri), minimum, maximum, oneOf, anyOf, allOf, if/then/else.
 *
 * Unsupported keywords are rejected rather than ignored so that a schema
 * change cannot silently weaken validation.
 */

const SUPPORTED = new Set([
  '$schema', '$id', '$defs', '$ref', 'title', 'description', 'default', 'examples',
  'if', 'then', 'else', 'const', 'enum', 'type', 'required', 'properties', 'additionalProperties',
  'propertyNames', 'items', 'minItems', 'maxItems', 'uniqueItems', 'minLength',
  'maxLength', 'pattern', 'format', 'minimum', 'maximum', 'oneOf', 'anyOf', 'allOf'
])

const FORMATS = {
  date: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)),
  'date-time': (value) => !Number.isNaN(Date.parse(value)),
  uri: (value) => /^https?:\/\/[^\s]+$/.test(value)
}

function typeOf (value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return typeof value
}

function deepEqual (first, second) {
  return JSON.stringify(first) === JSON.stringify(second)
}

function escapePath (segment) {
  return String(segment).replaceAll('.', '\\.')
}

function resolveRef (ref, root) {
  if (!ref.startsWith('#/')) {
    throw new Error(`Only local $ref values are supported: ${ref}`)
  }

  return ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((node, segment) => {
      if (node === undefined) throw new Error(`Unresolvable $ref: ${ref}`)
      return node[segment]
    }, root)
}

function checkUnsupportedKeywords (schema, where) {
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) {
      throw new Error(`Unsupported schema keyword "${key}" at ${where}`)
    }
  }
}

function matchesType (value, type) {
  const actual = typeOf(value)
  if (type === 'integer') return Number.isInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  return actual === type
}

function validateSchema (schema, value, root, pointer, errors) {
  if (schema === true) return
  if (schema === false) {
    errors.push(`${pointer}: no value is allowed here`)
    return
  }

  checkUnsupportedKeywords(schema, pointer)

  if (schema.$ref) {
    validateSchema(resolveRef(schema.$ref, root), value, root, pointer, errors)
    return
  }

  if ('const' in schema && !deepEqual(value, schema.const)) {
    errors.push(`${pointer}: must equal ${JSON.stringify(schema.const)}`)
  }

  if (schema.enum && !schema.enum.some((option) => deepEqual(option, value))) {
    errors.push(`${pointer}: must be one of ${schema.enum.map((option) => JSON.stringify(option)).join(', ')}`)
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some((type) => matchesType(value, type))) {
      errors.push(`${pointer}: must be of type ${types.join(' or ')}`)
      return
    }
  }

  if (schema.if) {
    const probe = []
    validateSchema(schema.if, value, root, `${pointer}.if`, probe)
    if (probe.length === 0) {
      if (schema.then) validateSchema(schema.then, value, root, `${pointer}.then`, errors)
    } else if (schema.else) {
      validateSchema(schema.else, value, root, `${pointer}.else`, errors)
    }
  }

  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    if (!schema[key]) continue
    const branchErrors = schema[key].map((branch, index) => {
      const branchResult = []
      validateSchema(branch, value, root, `${pointer}.${key}[${index}]`, branchResult)
      return branchResult
    })
    const passing = branchErrors.filter((result) => result.length === 0).length

    if (key === 'allOf') {
      for (const result of branchErrors) errors.push(...result)
    } else if (key === 'anyOf' && passing === 0) {
      errors.push(`${pointer}: must match at least one of the anyOf branches`)
    } else if (key === 'oneOf' && passing !== 1) {
      errors.push(`${pointer}: must match exactly one oneOf branch (matched ${passing})`)
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${pointer}: must be at least ${schema.minLength} characters`)
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${pointer}: must be at most ${schema.maxLength} characters`)
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${pointer}: must match ${schema.pattern}`)
    }
    if (schema.format) {
      const check = FORMATS[schema.format]
      if (!check) throw new Error(`Unsupported format "${schema.format}" at ${pointer}`)
      if (!check(value)) errors.push(`${pointer}: must be a valid ${schema.format}`)
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${pointer}: must be at least ${schema.minimum}`)
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${pointer}: must be at most ${schema.maximum}`)
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${pointer}: must contain at least ${schema.minItems} item(s)`)
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${pointer}: must contain at most ${schema.maxItems} item(s)`)
    }
    if (schema.uniqueItems) {
      const seen = new Set()
      for (const [index, item] of value.entries()) {
        const key = JSON.stringify(item)
        if (seen.has(key)) errors.push(`${pointer}[${index}]: duplicate item`)
        seen.add(key)
      }
    }
    if (schema.items) {
      for (const [index, item] of value.entries()) {
        validateSchema(schema.items, item, root, `${pointer}[${index}]`, errors)
      }
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${pointer}: missing required property "${key}"`)
    }

    const properties = schema.properties || {}
    for (const [key, property] of Object.entries(properties)) {
      if (key in value) {
        validateSchema(property, value[key], root, `${pointer}.${escapePath(key)}`, errors)
      }
    }

    if (schema.propertyNames) {
      for (const key of Object.keys(value)) {
        validateSchema(schema.propertyNames, key, root, `${pointer}.<key:${key}>`, errors)
      }
    }

    const additional = schema.additionalProperties
    if (additional === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) errors.push(`${pointer}: unexpected property "${key}"`)
      }
    } else if (additional && typeof additional === 'object') {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) validateSchema(additional, value[key], root, `${pointer}.${escapePath(key)}`, errors)
      }
    }
  }
}

/**
 * Validate a value against a schema object and return an array of messages.
 * An empty array means the value is valid.
 */
export function validateAgainstSchema (schema, value) {
  const errors = []
  validateSchema(schema, value, schema, '$', errors)
  return errors
}

export { SUPPORTED }

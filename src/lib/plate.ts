export const normalizePlate = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** Dutch side-code dashes between letter and digit groups: GXS26B → GXS-26-B. */
export const formatPlate = (value: string) => (normalizePlate(value).match(/[A-Z]+|\d+/g) ?? []).join('-')

export const isPlausiblePlate = (value: string) => {
  const v = normalizePlate(value)
  return v.length >= 4 && v.length <= 8
}

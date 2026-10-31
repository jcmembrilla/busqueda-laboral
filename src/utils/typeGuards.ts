export function isBlob(value: unknown): value is Blob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Blob).size === 'number' &&
    typeof (value as Blob).type === 'string'
  )
}

export function isFile(value: unknown): value is File {
  return isBlob(value) && typeof (value as File).name === 'string'
}

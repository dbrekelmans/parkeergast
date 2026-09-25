import { formatPlate } from '#/lib/plate'

export function Plate({ value, small }: { value: string; small?: boolean }) {
  return (
    <span className={small ? 'plate sm' : 'plate'} aria-label={`Kenteken ${formatPlate(value)}`}>
      <span className="eu" aria-hidden>
        NL
      </span>
      <span className="txt">{formatPlate(value)}</span>
    </span>
  )
}

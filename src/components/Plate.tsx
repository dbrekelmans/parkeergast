import { formatPlate } from '#/lib/plate'
import { cn } from '#/lib/utils'

export function Plate({ value, small }: { value: string; small?: boolean }) {
  return (
    <span
      className="inline-flex flex-none items-stretch overflow-hidden rounded-[5px] border-[1.5px] border-[#1a1a1a] bg-plate font-plate leading-none font-bold tracking-[0.04em] text-plate-foreground"
      aria-label={`Kenteken ${formatPlate(value)}`}
    >
      <span
        className="flex flex-col items-center justify-end bg-eu px-[3px] py-0.5 font-sans text-[9px] font-bold tracking-normal text-white before:mt-px before:mb-auto before:size-2 before:rounded-full before:border-[1.5px] before:border-dotted before:border-plate before:content-['']"
        aria-hidden
      >
        NL
      </span>
      <span className={cn(small ? 'px-1.5 py-[3px] text-[17px]' : 'px-2 py-1 text-[22px]')}>{formatPlate(value)}</span>
    </span>
  )
}

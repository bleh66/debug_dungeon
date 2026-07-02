type OptionButtonProps = {
  option: string
  optionIndex: number
  selected: boolean
  onSelect: (optionIndex: number) => void
}

function getOptionLabel(optionIndex: number) {
  return String.fromCharCode(65 + optionIndex)
}

export function OptionButton({ option, optionIndex, selected, onSelect }: OptionButtonProps) {
  return (
    <button
      className={`flex w-full items-start gap-3 border px-4 py-3 text-left transition-colors duration-200 ${
        selected
          ? 'border-[rgba(58,155,141,0.72)] bg-[rgba(58,155,141,0.18)] text-[color:var(--text)] shadow-[inset_4px_0_0_var(--primary)]'
          : 'border-[rgba(253,254,194,0.12)] bg-[rgba(0,0,0,0.12)] text-[color:var(--muted)] hover:border-[rgba(253,254,194,0.22)] hover:bg-[rgba(0,0,0,0.18)] hover:text-[color:var(--text)]'
      }`}
      onClick={() => onSelect(optionIndex)}
      type="button"
    > {/*this css is for the whole box */}
      <span className={`mt-[0.1rem] flex h-6 w-6 flex-none items-center justify-center border text-[0.55rem] ${
        selected
          ? 'border-[rgba(58,155,141,0.8)] bg-[rgba(58,155,141,0.22)] text-[color:var(--text)]'
          : 'border-[rgba(253,254,194,0.16)] bg-[rgba(0,0,0,0.18)] text-[color:var(--primary)]'
      }`}>
        {getOptionLabel(optionIndex)} {/* for the box with the option letter*/} 
      </span>
      <span className="min-w-0 flex-1 text-[0.92rem] leading-6">{option}</span>
    </button>
  )
}
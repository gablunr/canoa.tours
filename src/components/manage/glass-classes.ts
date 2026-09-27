export const flatGlass = 'liquid-glass backdrop-blur-xl backdrop-saturate-150 [--glass-drop-shadow:0_0_#0000]';

const glassSurface = 'liquid-glass transition-colors duration-300 ease-smooth [--glass-drop-shadow:0_0_#0000]';
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-accent';
const disabledState = 'disabled:pointer-events-none disabled:opacity-50';

export const glassPanel = `${flatGlass} rounded-[1.75rem] bg-ink-200/45`;

export const surfacePanel = 'rounded-[1.75rem] bg-surface';

export const glassGroup = `${flatGlass} bg-ink-200/40`;

export const glassTile = 'liquid-glass rounded-[1.25rem] bg-ink-300/40 [--glass-drop-shadow:0_0_#0000]';

export const glassControl = `${glassSurface} flex h-9 items-center bg-ink-200/60 text-[13px] font-medium text-primary`;

export const glassOption = `${glassSurface} ${focusRing} flex h-9 cursor-pointer items-center justify-center gap-1.5 bg-ink-200/60 px-3 text-xs font-medium whitespace-nowrap text-secondary hover:bg-ink-200/90 hover:text-primary sm:px-4 sm:text-[13px] aria-[current=page]:bg-primary/90 aria-[current=page]:text-white aria-pressed:bg-primary/90 aria-pressed:text-white`;

export const glassRadioOption = `${glassSurface} flex h-8 cursor-pointer items-center justify-center bg-ink-200/60 px-3.5 text-xs font-medium whitespace-nowrap text-secondary hover:bg-ink-200/90 hover:text-primary has-[:checked]:bg-primary/90 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent`;

export const glassButton = `${glassSurface} ${focusRing} ${disabledState} flex h-9 cursor-pointer items-center justify-center gap-1.5 bg-ink-200/60 px-4 text-[13px] font-medium whitespace-nowrap text-primary hover:bg-ink-200/90`;

export const glassButtonPrimary = `${glassSurface} ${focusRing} ${disabledState} flex h-9 cursor-pointer items-center justify-center gap-1.5 bg-primary/90 px-4 text-[13px] font-medium whitespace-nowrap text-white hover:bg-primary`;

export const glassPrimaryButton = `${glassSurface} ${focusRing} ${disabledState} flex h-10 cursor-pointer items-center justify-center gap-2 bg-primary/90 px-5 text-[13px] font-medium whitespace-nowrap text-white hover:bg-primary`;

export const glassCircle = `${glassSurface} ${focusRing} flex size-8 items-center justify-center bg-ink-200/60 text-xs font-medium text-secondary tabular-nums sm:size-9 sm:text-[13px] hover:bg-ink-200/90 hover:text-primary aria-[current=page]:bg-primary/90 aria-[current=page]:text-white`;

export const glassCircleDisabled = `${glassSurface} flex size-8 items-center justify-center bg-ink-200/60 text-secondary opacity-40 sm:size-9`;

export const glassChipButton = `${glassSurface} ${focusRing} ${disabledState} flex h-9 cursor-pointer items-center justify-center gap-1.5 bg-ink-300/40 px-3.5 text-xs font-medium whitespace-nowrap text-primary hover:bg-ink-300/60 sm:h-8`;

export const glassChipPrimaryButton = `${glassSurface} ${focusRing} ${disabledState} flex h-9 cursor-pointer items-center justify-center gap-1.5 bg-primary/90 px-3.5 text-xs font-medium whitespace-nowrap text-white hover:bg-primary sm:h-8`;


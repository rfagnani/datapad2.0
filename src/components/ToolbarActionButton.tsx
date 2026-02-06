import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from 'react'

export type ToolbarActionButtonProps = {
  label: string
  icon: string
  backgroundColor: string
} & ButtonHTMLAttributes<HTMLButtonElement>

const ToolbarActionButton = forwardRef<HTMLButtonElement, ToolbarActionButtonProps>(
  ({ label, icon, backgroundColor, className = '', style, type = 'button', ...rest }, ref) => {
    const mergedStyle = {
      ...style,
      ['--toolbar-action-bg' as const]: backgroundColor,
    } as CSSProperties

    return (
      <button
        ref={ref}
        type={type}
        className={`toolbar-action-button ${className}`.trim()}
        style={mergedStyle}
        {...rest}
      >
        <i className={`bi ${icon}`} aria-hidden="true"></i>
        <span>{label}</span>
      </button>
    )
  },
)

ToolbarActionButton.displayName = 'ToolbarActionButton'

export default ToolbarActionButton

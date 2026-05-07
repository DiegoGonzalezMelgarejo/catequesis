import type { ButtonProps } from '@/components/ui/button'
import { Button } from '@/components/ui/button'

export function SecondaryButton(props: ButtonProps) {
  return <Button {...props} variant={props.variant ?? 'secondary'} />
}

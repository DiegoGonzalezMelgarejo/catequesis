import type { ButtonProps } from '@/components/ui/button'
import { Button } from '@/components/ui/button'

export function PrimaryButton(props: ButtonProps) {
  return <Button {...props} variant={props.variant ?? 'default'} />
}

import { useLocation, useNavigate } from 'react-router-dom'

type BackNavigationState = {
  from?: string
  label?: string
}

export function useBackNavigation(fallbackTo: string, fallbackLabel: string) {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationState = (location.state ?? {}) as BackNavigationState

  return {
    backTo: navigationState.from ?? fallbackTo,
    backLabel: navigationState.label ?? fallbackLabel,
    goBack: () => navigate(navigationState.from ?? fallbackTo),
  }
}

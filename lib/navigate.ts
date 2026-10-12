type Go = (path: string) => void

let navigate: Go | null = null

export function setNavigator(go: Go) {
  navigate = go
}

export function goTo(path: string) {
  navigate?.(path)
}

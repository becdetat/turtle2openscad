import { useCallback, useEffect, useState } from 'react'

export type Settings = {
  arcPointsPer90Deg: number
}

const DEFAULTS: Settings = {
  arcPointsPer90Deg: 10,
}

const STORAGE_KEY = 'turtle2openscad:settings'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      arcPointsPer90Deg:
        typeof parsed.arcPointsPer90Deg === 'number' ? parsed.arcPointsPer90Deg : DEFAULTS.arcPointsPer90Deg,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const setSettings = useCallback((partial: Partial<Settings>) => {
    setSettingsState((prev) => ({ ...prev, ...partial }))
  }, [])

  const resetArcPoints = useCallback(() => {
    setSettings({ arcPointsPer90Deg: DEFAULTS.arcPointsPer90Deg })
  }, [setSettings])

  return { settings, setSettings, resetArcPoints, DEFAULTS }
}

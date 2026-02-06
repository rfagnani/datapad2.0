import { useMemo } from 'react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (BR)' },
] as const

const normalize = (value?: string) => value?.toLowerCase() ?? ''

export function LanguageSelector() {
  const { i18n, t } = useTranslation()

  const activeLanguage = useMemo(() => {
    const resolved = normalize(i18n.resolvedLanguage)
    const exact = languages.find((entry) => normalize(entry.code) === resolved)
    if (exact) {
      return exact.code
    }

    const approximate = languages.find((entry) => resolved.startsWith(normalize(entry.code.split('-')[0])))
    if (approximate) {
      return approximate.code
    }

    const fallback = normalize(i18n.language)
    const fallbackMatch = languages.find((entry) => normalize(entry.code) === fallback)
    return fallbackMatch?.code ?? 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value)
  }

  return (
    <label className="language-selector" htmlFor="language-select">
      <span>{t('languageLabel')}</span>
      <select id="language-select" value={activeLanguage} onChange={handleChange}>
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default LanguageSelector

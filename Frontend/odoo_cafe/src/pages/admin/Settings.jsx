import {
  CheckCircle2,
  Mail,
  Palette,
  Save,
  Settings2,
  ShoppingBag,
  Store,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getAdminSettings,
  updateAdminSettings,
  uploadAdminSettingImage,
} from '../../api/settingsApi'

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#c8793f] focus:ring-2 focus:ring-[#fcd8b8]'

const defaultSettings = {
  cafe_name: 'Odoo Cafe',
  email: '',
  background_color: '#ECE0D1',
  background_image: '',
  self_ordering_enabled: true,
  self_ordering_mode: 'ONLINE_ORDERING',
}

const modeLabels = {
  ONLINE_ORDERING: 'Online Ordering',
  TABLE_ORDERING: 'Table Ordering',
  QR_ORDERING: 'QR Ordering',
}

const parseBoolean = (value) => value === true || value === 'true' || value === '1' || value === 1

const Toggle = ({ enabled, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative h-7 w-12 rounded-full transition ${enabled ? 'bg-[#c8793f]' : 'bg-slate-300'}`}
    aria-label={label}
  >
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-6' : 'left-1'}`} />
  </button>
)

const SummaryCard = ({ label, value, icon: Icon, iconClass }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-2 truncate text-xl font-black text-slate-950">{value}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </article>
)

const SectionCard = ({ title, icon: Icon, children, className = '' }) => (
  <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 ${className}`}>
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff3e8] text-[#9a5a2e] ring-1 ring-[#fcd8b8]">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="text-base font-black text-slate-900">{title}</h3>
    </div>
    <div className="mt-4">{children}</div>
  </section>
)

const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setError('')
        const response = await getAdminSettings()
        const backendSettings = response.data.settings || {}
        setSettings({
          background_color: backendSettings.background_color || defaultSettings.background_color,
          background_image: backendSettings.background_image || '',
          cafe_name: backendSettings.cafe_name || defaultSettings.cafe_name,
          email: backendSettings.email || defaultSettings.email,
          self_ordering_enabled: parseBoolean(backendSettings.self_ordering_enabled),
          self_ordering_mode: backendSettings.self_ordering_mode || defaultSettings.self_ordering_mode,
        })
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load settings.')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const summaryCards = useMemo(
    () => [
      {
        label: 'Cafe Name',
        value: settings.cafe_name || '-',
        icon: Store,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
      {
        label: 'Email',
        value: settings.email || '-',
        icon: Mail,
        iconClass: 'bg-sky-50 text-sky-600 ring-sky-100',
      },
      {
        label: 'Self Ordering',
        value: settings.self_ordering_enabled ? 'Enabled' : 'Disabled',
        icon: ShoppingBag,
        iconClass: settings.self_ordering_enabled
          ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200',
      },
      {
        label: 'Ordering Mode',
        value: modeLabels[settings.self_ordering_mode] || settings.self_ordering_mode,
        icon: Settings2,
        iconClass: 'bg-[#fff3e8] text-[#9a5a2e] ring-[#fcd8b8]',
      },
    ],
    [settings],
  )

  const updateSetting = (key, value) => {
    setSaved(false)
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const saveSettings = async () => {
    try {
      setIsSaving(true)
      setError('')
      await updateAdminSettings({
        cafe_name: settings.cafe_name,
        email: settings.email,
        background_color: settings.background_color,
        background_image: settings.background_image,
        self_ordering_enabled: settings.self_ordering_enabled ? '1' : '0',
        self_ordering_mode: settings.self_ordering_mode,
      })
      setSaved(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const uploadImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setSaved(false)
      setError('')
      const response = await uploadAdminSettingImage(file)
      updateSetting('background_image', response.data.filePath || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to upload background image.')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="min-h-screen space-y-4">
      {error ? (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">System Settings</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              These fields are loaded from the backend system settings table.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {saved ? (
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            ) : null}
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#c8793f] px-4 text-sm font-black text-white hover:bg-[#9a5a2e] disabled:cursor-wait disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-lg border border-[#fcd8b8] bg-[#fff3e8] px-4 py-3 text-sm font-bold text-[#9a5a2e]">
          Loading settings...
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Cafe Profile" icon={Store}>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="text-xs font-black uppercase text-slate-500">Cafe Name</span>
              <input
                value={settings.cafe_name}
                onChange={(event) => updateSetting('cafe_name', event.target.value)}
                className={`mt-2 ${inputClass}`}
              />
            </label>
            <label>
              <span className="text-xs font-black uppercase text-slate-500">Email</span>
              <input
                type="email"
                value={settings.email}
                onChange={(event) => updateSetting('email', event.target.value)}
                className={`mt-2 ${inputClass}`}
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Self Ordering" icon={ShoppingBag}>
          <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-950">Self Ordering Enabled</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  Controls whether customer self ordering is available.
                </p>
              </div>
              <Toggle
                enabled={settings.self_ordering_enabled}
                onClick={() => updateSetting('self_ordering_enabled', !settings.self_ordering_enabled)}
                label="Toggle self ordering"
              />
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase text-slate-500">Self Ordering Mode</span>
            <select
              value={settings.self_ordering_mode}
              onChange={(event) => updateSetting('self_ordering_mode', event.target.value)}
              className={`mt-2 ${inputClass}`}
            >
              <option value="ONLINE_ORDERING">Online Ordering</option>
              <option value="TABLE_ORDERING">Table Ordering</option>
              <option value="QR_ORDERING">QR Ordering</option>
            </select>
          </label>
        </SectionCard>

        <SectionCard title="Customer Screen Background" icon={Palette} className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-[0.75fr_1.25fr]">
            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">Background Color</span>
              <div className="mt-2 flex gap-2">
                <input
                  type="color"
                  value={settings.background_color}
                  onChange={(event) => updateSetting('background_color', event.target.value)}
                  className="h-10 w-14 rounded-lg border border-slate-200 bg-white p-1"
                />
                <input
                  value={settings.background_color}
                  onChange={(event) => updateSetting('background_color', event.target.value)}
                  className={inputClass}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">Background Image</span>
              <input
                value={settings.background_image}
                onChange={(event) => updateSetting('background_image', event.target.value)}
                placeholder="/uploads/background.jpg"
                className={`mt-2 ${inputClass}`}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[0.75fr_1.25fr]">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Image'}
              <input type="file" accept="image/*" onChange={uploadImage} disabled={isUploading} className="hidden" />
            </label>

            <div
              className="min-h-32 rounded-lg border border-slate-200 bg-cover bg-center p-4"
              style={{
                backgroundColor: settings.background_color,
                backgroundImage: settings.background_image ? `url(${settings.background_image})` : 'none',
              }}
            >
              <div className="inline-flex rounded-lg bg-white/90 px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                Background Preview
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export default Settings

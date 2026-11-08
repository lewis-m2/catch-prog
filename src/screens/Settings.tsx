import { useState, type ReactNode } from 'react';
import { BigButton } from '../components/BigButton';
import { ConfirmButton } from '../components/ConfirmButton';
import { downloadText, readFileText } from '../components/download';
import { LinkButton } from '../components/LinkButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { BackLink } from '../components/BackLink';
import { clearAllData, createBackup, restoreBackup, tableNames } from '../db/backup';
import { ACCENT_PRESETS, COLOUR_BLIND_GO_STOP, lowContrastThemes, TEXT_SCALES } from '../lib/appearance';
import { backupFileName, parseBackup, type Backup } from '../lib/backup';
import { normaliseHex } from '../lib/colour';
import { vibrate, HAPTIC_GO } from '../lib/haptics';
import type { ProgramSetting } from '../lib/programme';
import { STROKE_COUNTS } from '../lib/rate';
import type { ThemeSetting } from '../lib/theme';
import { mergeSettings, settingsData, useSettings } from '../state/settings';
import { useTimers } from '../state/timers';

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'sun', label: 'Sun' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'auto', label: 'Auto' },
];

const PROGRAMMES: { value: ProgramSetting; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'club', label: 'Club' },
  { value: 'both', label: 'Both' },
];

const ON_OFF = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
];

/** The theme's own colours, used as the starting point for a custom go/stop. */
const DEFAULT_GO = '#00a35c';
const DEFAULT_STOP = '#e5322d';

export function Settings() {
  const settings = useSettings();
  const { update, updateRate } = settings;

  return (
    <>
      <ScreenHeader title="Settings" action={<BackLink to="/crews" />} />

      <div className="flex flex-col gap-8">
        <Section title="Programme">
          <Segmented label="Programme" hideLabel options={PROGRAMMES} value={settings.program} onChange={(program) => update({ program })} />
          <p className="text-base text-muted">Sets which grades and prognostic tables are used. Existing crews keep theirs.</p>
          <LinkButton to="/crews/settings/progs" variant="secondary" size="control">
            Prognostic tables
          </LinkButton>
        </Section>

        <Section title="Appearance">
          <Segmented label="Theme" options={THEMES} value={settings.theme} onChange={(theme) => update({ theme })} size="primary" />
          <AccentPicker />
          <GoStopPicker />
          <Segmented label="Text size" options={TEXT_SCALES} value={settings.textScale} onChange={(textScale) => update({ textScale })} />
        </Section>

        <Section title="Stroke rate">
          <Segmented
            label="Strokes per measurement"
            options={STROKE_COUNTS.map((n) => ({ value: n, label: String(n) }))}
            value={settings.rate.strokes}
            onChange={(strokes) => updateRate({ strokes })}
          />
          <Segmented
            label="Continuous (each reading starts the next)"
            options={ON_OFF}
            value={settings.rate.continuous}
            onChange={(continuous) => updateRate({ continuous })}
          />
          <Segmented
            label="Forget a first tap after"
            options={[5, 10, 15, 20].map((sec) => ({ value: sec, label: `${sec} s` }))}
            value={settings.rate.autoResetSec}
            onChange={(autoResetSec) => updateRate({ autoResetSec })}
          />
        </Section>

        <Section title="Staggered pieces">
          <Segmented
            label="Round start gaps to"
            options={[
              { value: 0.5, label: '0.5 s' },
              { value: 1, label: '1 s' },
            ]}
            value={settings.gapRounding}
            onChange={(gapRounding) => update({ gapRounding: gapRounding as 0.5 | 1 })}
          />
        </Section>

        <Section title="Phone">
          <Segmented label="Vibrate on taps" options={ON_OFF} value={settings.haptics} onChange={(haptics) => update({ haptics })} />
          <Segmented
            label="Keep the screen on during a session"
            options={ON_OFF}
            value={settings.wakeLock}
            onChange={(wakeLock) => update({ wakeLock })}
          />
          <BigButton variant="secondary" onClick={() => vibrate(HAPTIC_GO)}>
            Test vibration
          </BigButton>
        </Section>

        <DataSection />

        <p className="text-base">
          <span className="text-muted">Build: </span>
          <span className="font-semibold">{__BUILD_ID__}</span>
        </p>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-2xl font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({ colour, label, selected, onClick }: { colour: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      style={{ backgroundColor: colour }}
      className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-extrabold text-white active:opacity-70 ${
        selected ? 'ring-4 ring-ink ring-offset-2 ring-offset-bg' : ''
      }`}
    >
      {selected && <span className="drop-shadow-[0_0_2px_black]">✓</span>}
    </button>
  );
}

function ColourInput({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setText(event.target.value);
          }}
          className="h-12 w-14 rounded-lg border-2 border-surface bg-bg"
        />
        <span className="text-lg font-semibold">{label}</span>
      </label>
      <input
        aria-label={`${label} hex code`}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const hex = normaliseHex(event.target.value);
          if (hex) onChange(hex);
        }}
        className="time min-h-control w-32 rounded-xl border-2 border-surface bg-bg px-3 text-lg font-normal"
      />
    </div>
  );
}

function ContrastWarning({ hex, name }: { hex: string; name: string }) {
  const themes = lowContrastThemes(hex);
  if (themes.length === 0) return null;
  const where = themes.map((theme) => (theme === 'sun' ? 'the light (Sun)' : 'the dark (Dawn)')).join(' and ');
  return (
    <p role="alert" className="rounded-lg bg-warn px-3 py-1 text-base font-bold text-black">
      ⚠ {name} is hard to see on {where} background, especially in sunlight.
    </p>
  );
}

function AccentPicker() {
  const accent = useSettings((state) => state.accent);
  const update = useSettings((state) => state.update);
  const presetMatch = ACCENT_PRESETS.find((preset) => preset.hex === accent);
  const [custom, setCustom] = useState(accent !== null && !presetMatch);
  const current = accent ?? ACCENT_PRESETS[0]!.hex;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base font-semibold text-muted">Accent colour (buttons, selected tab)</span>
      <div className="flex flex-wrap gap-3">
        {ACCENT_PRESETS.map((preset, index) => {
          // The first preset is the theme's own blue (slightly brighter in Dawn).
          const value = index === 0 ? null : preset.hex;
          return (
            <Swatch
              key={preset.name}
              colour={preset.hex}
              label={preset.name}
              selected={!custom && accent === value}
              onClick={() => {
                setCustom(false);
                update({ accent: value });
              }}
            />
          );
        })}
        <BigButton variant={custom ? 'primary' : 'secondary'} aria-pressed={custom} onClick={() => setCustom(true)}>
          {custom ? '✓ Custom' : 'Custom'}
        </BigButton>
      </div>
      {custom && <ColourInput label="Accent" value={current} onChange={(hex) => update({ accent: hex })} />}
      <ContrastWarning hex={current} name="This accent" />
    </div>
  );
}

type GoStopMode = 'default' | 'colourblind' | 'custom';

function GoStopPicker() {
  const goColor = useSettings((state) => state.goColor);
  const stopColor = useSettings((state) => state.stopColor);
  const update = useSettings((state) => state.update);
  const stored: GoStopMode =
    goColor === null && stopColor === null
      ? 'default'
      : goColor === COLOUR_BLIND_GO_STOP.goColor && stopColor === COLOUR_BLIND_GO_STOP.stopColor
        ? 'colourblind'
        : 'custom';
  const [mode, setMode] = useState<GoStopMode>(stored);

  const choose = (next: GoStopMode) => {
    setMode(next);
    if (next === 'default') update({ goColor: null, stopColor: null });
    if (next === 'colourblind') update(COLOUR_BLIND_GO_STOP);
    if (next === 'custom') update({ goColor: goColor ?? DEFAULT_GO, stopColor: stopColor ?? DEFAULT_STOP });
  };

  return (
    <div className="flex flex-col gap-2">
      <Segmented
        label="Go / stop colours"
        options={[
          { value: 'default', label: 'Green / red' },
          { value: 'colourblind', label: 'Colour-blind safe' },
          { value: 'custom', label: 'Custom' },
        ]}
        value={mode}
        onChange={choose}
      />
      {mode === 'custom' && (
        <>
          <ColourInput label="Go" value={goColor ?? DEFAULT_GO} onChange={(hex) => update({ goColor: hex })} />
          <ColourInput label="Stop" value={stopColor ?? DEFAULT_STOP} onChange={(hex) => update({ stopColor: hex })} />
        </>
      )}
      <div aria-hidden="true" className="flex gap-2">
        <span className="flex min-h-control flex-1 items-center justify-center rounded-xl bg-go text-lg font-bold text-on-go">Start</span>
        <span className="flex min-h-control flex-1 items-center justify-center rounded-xl bg-stop text-lg font-bold text-on-stop">Stop</span>
      </div>
      {goColor && <ContrastWarning hex={goColor} name="The go colour" />}
      {stopColor && <ContrastWarning hex={stopColor} name="The stop colour" />}
    </div>
  );
}

function DataSection() {
  const sessionActive = useTimers((state) => state.session !== null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportBackup = async () => {
    const backup = await createBackup(settingsData(useSettings.getState()));
    downloadText(backupFileName(backup.exportedAt), JSON.stringify(backup), 'application/json');
  };

  const restore = async (backup: Backup) => {
    await restoreBackup(backup);
    useSettings.setState(mergeSettings(backup.settings, useSettings.getState()));
    await useTimers.getState().load();
    setPending(null);
    setMessage('Backup restored.');
  };

  return (
    <Section title="Data">
      <p className="text-base text-muted">Everything is stored on this phone only. Back it up now and then.</p>
      <BigButton variant="secondary" onClick={() => void exportBackup()}>
        Export backup
      </BigButton>

      {sessionActive ? (
        <p className="text-base font-bold">End the session to import a backup or clear data.</p>
      ) : (
        <>
          <label className="flex min-h-control cursor-pointer items-center justify-center rounded-xl bg-surface px-4 text-lg font-bold active:opacity-70">
            Import backup…
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setMessage(null);
                void readFileText(file).then((text) => {
                  const result = parseBackup(text, tableNames());
                  if (typeof result === 'string') setMessage(result);
                  else setPending(result);
                });
              }}
            />
          </label>

          {pending && (
            <div className="flex flex-col gap-2 rounded-xl border-2 border-surface p-3">
              <p className="text-lg">
                Backup from <span className="font-bold">{new Date(pending.exportedAt).toLocaleString()}</span>:{' '}
                {summarise(pending)}.
              </p>
              <ConfirmButton
                label="Replace all data with this backup"
                question="Replace everything on this phone with the backup?"
                confirmLabel="Replace"
                onConfirm={() => void restore(pending)}
              />
            </div>
          )}

          <ConfirmButton
            label="Clear all data"
            question="Delete all crews, sessions, readings and table edits?"
            confirmLabel="Continue"
            secondQuestion="This can't be undone. Delete everything?"
            secondConfirmLabel="Delete everything"
            onConfirm={() =>
              void clearAllData().then(() => {
                setPending(null);
                setMessage('All data cleared. Settings were kept.');
              })
            }
          />
        </>
      )}
      {message && (
        <p role="status" className="text-lg font-bold">
          {message}
        </p>
      )}
    </Section>
  );
}

function summarise(backup: Backup): string {
  const count = (name: string, label: string) => `${backup.tables[name]?.length ?? 0} ${label}`;
  return [count('crews', 'crews'), count('sessions', 'sessions'), count('pieces', 'pieces'), count('rateReadings', 'rate readings')].join(', ');
}

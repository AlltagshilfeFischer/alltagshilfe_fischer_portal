# easy-assist-hub

## Projektinfo

**Easy Assist Hub** – ein Mitarbeiter- und Kundenportal für Pflegedienste.

## Technologie-Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI:** shadcn-ui, Tailwind CSS
- **Backend:** Supabase (Datenbank, Auth, Edge Functions)
- **KI-Funktionen:** OpenAI API (GPT-4o-mini)

## Lokale Entwicklung

### Voraussetzungen

- Node.js (empfohlen via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm

### Setup

```sh
# 1. Repository klonen
git clone <GIT_URL>

# 2. In das Projektverzeichnis wechseln
cd easy-assist-hub

# 3. Abhängigkeiten installieren
npm install

# 4. Entwicklungsserver starten
npm run dev
```

Die App ist dann unter `http://localhost:8080` erreichbar.

## Umgebungsvariablen (Edge Functions)

Folgende Secrets müssen in Supabase konfiguriert werden:

| Variable | Beschreibung |
|---|---|
| `OPENAI_API_KEY` | OpenAI API-Schlüssel für KI-Funktionen |
| `RESEND_API_KEY` | Resend API-Schlüssel für E-Mail-Versand |
| `SITE_URL` | Öffentliche URL der App |

## Deployment

Das Projekt wird über Supabase Edge Functions und einem statischen Hosting-Provider betrieben.

## Build

```sh
npm run build
```

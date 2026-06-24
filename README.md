# SocialBoard — Дашборд Instagram + TikTok

Аналитика всех подключённых аккаунтов в одном месте. Поддержка 10+ аккаунтов, проектная группировка, триггерные теги, авто-синхронизация каждые 6 часов.

---

## Стек
- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + хранилище данных)
- **Instagram Graph API** (официальный, для своих аккаунтов)
- **TikTok Content API** (официальный)
- **Vercel** (деплой + Cron Jobs)

---

## Быстрый старт

### 1. Supabase

1. Создай проект на [supabase.com](https://supabase.com)
2. Перейди в **SQL Editor** и выполни содержимое файла `supabase/migrations/001_initial.sql`
3. Скопируй `Project URL` и `anon key` из Settings → API

### 2. Instagram (Meta) App

1. Создай приложение на [developers.facebook.com](https://developers.facebook.com)
2. Добавь продукт **Instagram Basic Display**
3. В настройках укажи Redirect URI:
   ```
   https://your-domain.vercel.app/api/instagram/callback
   ```
4. Добавь тестовых пользователей и выдай им доступ
5. Скопируй **App ID** и **App Secret**

> ⚠️ Для production нужно пройти App Review в Meta для получения прав `instagram_manage_insights`

### 3. TikTok App

1. Создай приложение на [developers.tiktok.com](https://developers.tiktok.com)
2. В разделе **Login Kit** добавь Redirect URI:
   ```
   https://your-domain.vercel.app/api/tiktok/callback
   ```
3. Запроси скоупы: `user.info.basic`, `video.list`
4. Скопируй **Client Key** и **Client Secret**

### 4. Настрой переменные окружения

Скопируй `.env.example` в `.env.local` и заполни все значения:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

INSTAGRAM_APP_ID=123456789
INSTAGRAM_APP_SECRET=abcdef...
INSTAGRAM_REDIRECT_URI=https://your-domain.vercel.app/api/instagram/callback

TIKTOK_CLIENT_KEY=aw...
TIKTOK_CLIENT_SECRET=abc...
TIKTOK_REDIRECT_URI=https://your-domain.vercel.app/api/tiktok/callback

NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
CRON_SECRET=make-up-a-random-secret-string
```

### 5. Деплой на Vercel

```bash
npm install -g vercel
vercel --prod
```

Или через GitHub:
1. Запушь репо на GitHub
2. Подключи на [vercel.com](https://vercel.com)
3. Добавь все переменные окружения в Vercel Dashboard
4. Деплой автоматически

### 6. Локальная разработка

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Использование

### Создание проекта
1. В дашборде нажми **+ Аккаунт**
2. Выбери или создай проект (например, "Клиент А")

### Подключение аккаунта
1. Нажми **+ Аккаунт** → выбери проект → нажми **Подключить Instagram** или **Подключить TikTok**
2. Авторизуйся в Meta/TikTok
3. Автоматически начнётся первичная синхронизация

### Синхронизация
- **Автоматически** — каждые 6 часов (Vercel Cron)
- **Вручную** — кнопка **Синхронизировать** в шапке

### Теги и фильтрация
- На каждой карточке → кнопка **Теги** — добавь теги
- В фильтрах вверху — фильтруй по тегу, проекту, платформе, ключевому слову

---

## Структура проекта

```
src/
  app/
    api/
      instagram/callback/  # OAuth callback
      tiktok/callback/     # OAuth callback
      accounts/            # CRUD аккаунтов
      posts/               # Список + обновление тегов
      projects/            # CRUD проектов
      sync/                # Синхронизация (+ cron endpoint)
    dashboard/             # Главная страница
  lib/
    api/
      instagram.ts         # Instagram Graph API
      tiktok.ts            # TikTok API
    db/
      supabase.ts          # Supabase клиент
  types/
    index.ts               # TypeScript типы
supabase/
  migrations/
    001_initial.sql        # Схема БД
```

---

## Автосинхронизация

`vercel.json` настроен на запуск `/api/sync` каждые 6 часов.
Для защиты от внешних вызовов используй `CRON_SECRET` — Vercel автоматически передаёт его в заголовке `Authorization`.

---

## Метрики по платформам

| Метрика | Instagram | TikTok |
|---------|-----------|--------|
| Просмотры | ✅ (plays) | ✅ |
| Лайки | ✅ | ✅ |
| Комментарии | ✅ | ✅ |
| Репосты | ✅ | ✅ |
| Сохранения | ✅ | ❌ (API не отдаёт) |
| Охват | ✅ | ❌ |
| Impressions | ✅ | ❌ |

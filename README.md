# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Environment variables

To persist chat history in Neon, configure:

```bash
DATABASE_URL=postgres://...
SHARED_AI_GATEWAY_API_KEY=...
```

Apply DB schema once with:

```bash
psql "$DATABASE_URL" -f lib/server/chat-schema.sql
```

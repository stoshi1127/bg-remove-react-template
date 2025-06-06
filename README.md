This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

This project requires a Replicate API token. Copy the `.env.example` file to `.env` and add your Replicate API token:

```bash
cp .env.example .env
```

Then, open `.env` and set the `REPLICATE_API_TOKEN` variable.

### Building the project

To build the project for production, run:

```bash
pnpm build
```

### Processing Details

All background removal processing is handledサーバーサイド via the [Replicate API](https://replicate.com/). Uploaded images are processed by Replicate and are temporarily stored on their CDN for less than 60 minutes before being automatically deleted. 

Based on current Replicate pricing for the `rembg` model, the estimated cost for processing is approximately **$0.15 per 1000 images**.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

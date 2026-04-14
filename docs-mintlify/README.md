# QuickCommerce Tracker - Mintlify Documentation

This directory contains the complete Mintlify documentation for QuickCommerce Tracker.

## Structure

```
docs-mintlify/
├── mint.json                    # Mintlify configuration file
├── index.mdx                    # Home page
├── quickstart.mdx               # Quick start guide
├── installation.mdx             # Installation guide
├── guides/                      # Feature guides
│   ├── overview.mdx             # Core concepts overview
│   ├── categories.mdx           # Category management
│   ├── platforms.mdx            # Platform information
│   ├── pricing.mdx              # Pricing tracking guide
│   ├── analytics.mdx            # Analytics features
│   ├── alerts.mdx               # Alert setup and management
│   ├── export.mdx               # Data export guide
│   ├── search.mdx               # Search functionality
│   ├── api-integration.mdx     # API integration guide
│   ├── data-sync.mdx            # Advanced features and webhooks
│   ├── faq.mdx                  # Frequently asked questions
│   └── troubleshooting.mdx     # Troubleshooting guide
├── api-reference/               # API documentation
│   ├── overview.mdx             # API overview
│   ├── products.mdx             # Products endpoint
│   ├── alerts.mdx               # Alerts endpoint
│   └── analytics.mdx            # Analytics endpoint
└── images/                      # Image assets directory
```

## Getting Started

### Option 1: Host with Mintlify CLI

Install Mintlify CLI:
```bash
npm install -g mintlify
```

Start local development server:
```bash
cd docs-mintlify
mintlify dev
```

Open `http://localhost:3000` in your browser.

### Option 2: Deploy to Mintlify Cloud

1. Push this repo to GitHub
2. Go to [mintlify.com](https://mintlify.com)
3. Connect your GitHub repository
4. Follow deployment instructions

### Option 3: Edit Files Locally

All documentation is in Markdown/MDX format. You can:
1. Edit files directly in any text editor
2. Use the `mint.json` to configure navigation
3. Generate Markdown/Preview using your preferred tool

## Configuration

The `mint.json` file contains:
- Site title and branding
- Navigation structure
- Color scheme
- API endpoints
- Deployment settings

### Common Customizations

**Change site name:**
```json
{
  "name": "Your Project Name"
}
```

**Update colors:**
```json
{
  "colors": {
    "primary": "#your-color",
    "dark": "#your-dark-color"
  }
}
```

**Add navigation items:**
Edit the `navigation` array in `mint.json`.

## Writing Documentation

### Markdown Files

All files are `.mdx` files (Markdown + JSX). Basic Markdown works:

```markdown
# Heading 1
## Heading 2

**Bold text**
*Italic text*

- Bullet list
- Another item

### Code Block
\`\`\`javascript
const code = true;
\`\`\`
```

### MDX Components

Use special Mintlify components:

```mdx
<CardGroup cols={2}>
  <Card title="Card Title" icon="star">
    Card content here
  </Card>
</CardGroup>

<Steps>
  <Step title="Step 1">
    First step
  </Step>
  <Step title="Step 2">
    Second step
  </Step>
</Steps>
```

## File Naming

- Use kebab-case for file names: `my-guide.mdx`
- Match file names in `mint.json` navigation
- Update `mint.json` when adding new files

## Adding Images

1. Place images in `images/` directory
2. Reference them in markdown:
   ```markdown
   ![Alt text](/images/screenshot.png)
   ```

## Navigation Structure

Edit `mint.json` to update the left sidebar navigation:

```json
{
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["index", "quickstart", "installation"]
    },
    {
      "group": "Guides",
      "pages": ["guides/overview", "guides/pricing"]
    }
  ]
}
```

## Deployment Steps

### To Mintlify Cloud

1. Ensure all files are in this `docs-mintlify/` directory
2. Commit and push to GitHub
3. Go to https://dashboard.mintlify.com
4. Click "Create project from GitHub"
5. Select your repository
6. Configure deployment settings
7. Your docs are live!

### To Custom Domain

1. Build static site: `mintlify build`
2. Deploy `dist/` folder to your hosting (Vercel, Netlify, etc.)

### Local Testing Before Deploy

```bash
mintlify dev
```

Visit `http://localhost:3000` to preview your changes.

## Editing Tips

### Add a new guide:
1. Create `guides/my-new-guide.mdx`
2. Add to `mint.json` navigation array
3. Use existing guides as template

### Edit existing page:
1. Open the `.mdx` file
2. Edit content in Markdown
3. Save and the site refreshes

### Update navigation:
1. Edit `mint.json`
2. Update `navigation` array
3. Save and the sidebar updates

## Support

For Mintlify-specific questions:
- [Mintlify Docs](https://mintlify.com/docs)
- [Mintlify GitHub](https://github.com/mintlifyio/mintlify)

For QuickCommerce Tracker documentation:
- Email: support@creatosaurus.in

## Version Control

Keep `mint.json` in version control. Recommended `.gitignore` entries:
```
node_modules/
.mintlify/
dist/
```

---

**Last Updated:** March 17, 2025
**Maintained by:** QuickCommerce Tracker Team

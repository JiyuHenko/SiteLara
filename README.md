# LB FIT / Lara Biagioni — influencer application workflow

A client project built to turn a social-media recruitment campaign into a structured operational workflow.

The public repository contains the front end for:

- the LB FIT influencer application flow;
- draft persistence and field validation;
- review-before-submit;
- submission to a Google Apps Script web app;
- confirmation / retry handling;
- an administrative entry point used to review applicants.

The Apps Script backend and Google Sheets data are intentionally managed outside this repository.

## Problem

The client needed more than a landing page: applicants had to move through a clear multi-step form, submit structured data reliably, and reach an internal review workflow without introducing a full custom backend stack.

The implementation uses a static public front end with Google Apps Script as the integration layer.

## Public flow

`/influenciadoras/` implements a seven-step application experience with:

- contact and location fields;
- social profile normalization;
- conditional fields;
- input validation;
- consent;
- review before submission;
- local draft persistence;
- pending-submission recovery;
- reduced-motion aware navigation.

Configuration lives in:

```text
influenciadoras/config.js
```

The browser submits to the configured Apps Script deployment and then waits for confirmation rather than assuming that a request attempt means the application was persisted.

## Admin flow

`/admin/` embeds the external Apps Script administrative interface.

The operational backend keeps applicant status in Google Sheets and exposes the review UI through the deployed Apps Script application.

A status-flow update is documented in:

```text
apps-script/STATUS_NO_TIME.md
```

That document is intentionally an integration note rather than backend source code: the corresponding Apps Script project is maintained separately.

## Architecture

```text
Applicant
   ↓
Static multi-step form
   ↓
Validation + normalization + local draft
   ↓
Google Apps Script web app
   ↓
Google Sheets
   ↓
Admin review workflow
```

A submission is treated as pending until the client receives the expected confirmation path. The front end also stores enough local state to recover from interrupted submissions.

## Repository structure

```text
.
├── index.html
├── links/
├── influenciadoras/
│   ├── index.html
│   ├── app.js
│   ├── config.js
│   └── styles.css
├── admin/
│   └── index.html
└── apps-script/
    └── STATUS_NO_TIME.md
```

## Engineering choices

### Keep the public surface simple

The site can be hosted as static files on GitHub Pages. There is no application server to maintain for the public UI.

### Keep backend authority outside the static repository

Applicant records and administrative state live in the external Apps Script / Sheets workflow rather than being embedded in the public codebase.

### Do not confuse request success with persisted success

The client includes pending-state and confirmation handling instead of treating the first network event as proof that the application is stored.

### Preserve recoverability

Draft and pending-submission state are persisted locally so a temporary failure does not automatically force the applicant to re-enter the whole form.

## Deployment

The public site is served through GitHub Pages and the custom domain:

```text
https://larabiagioni.com.br/
```

The Apps Script deployment URL is referenced from the front-end configuration. When the external Apps Script implementation changes, the existing deployment URL is kept stable whenever possible.

## Privacy note

This repository contains the public client implementation only. It should not contain applicant records, private spreadsheet data, authentication secrets, or confidential client data.

---

Client work by [Custom Mind](https://www.custommind.com.br/) · engineering by [Mateus Lemos Figueiredo (Jiyu Henko)](https://jiyuhenko.github.io/mateus-lemos-figueiredo/).

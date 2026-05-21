# LawSync - AI-Powered Legal Document Analysis

LawSync is an intelligent legal document analysis platform that uses Google Gemini AI to analyze contracts, extract risks, and provide instant legal insights.

## Features

- 🔐 **Email/Password Authentication** - Secure local authentication
- 📄 **Multi-format Support** - Upload PDF (scanned & digital), DOCX, and TXT files
- 🤖 **Gemini AI Vision OCR** - Extract text from scanned PDFs and images
- 📊 **Risk Scorecard** - Visual risk assessment (0-100 score)
- 🚩 **Red Flags Detection** - AI-identified critical clauses
- 💬 **AI Chat Assistant** - Ask questions about your documents
- 📝 **Document Simplification** - Convert legalese to plain English
- 🌓 **Dark/Light Theme** - User preference support
- 👤 **Profile Management** - Edit name, phone, and preferences
- 📥 **Export Reports** - Download analysis as TXT

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **AI**: Google Gemini 2.5 Flash with Vision capabilities
- **Authentication**: Local JWT-based auth
- **File Processing**: PDF-parse, Mammoth.js, Gemini Vision OCR

## Run Locally

```bash
npm install
npm run dev
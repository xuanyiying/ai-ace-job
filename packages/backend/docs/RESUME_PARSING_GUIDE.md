# Resume Parsing Guide

This document describes how the AI Resume Optimizer handles resume uploads and parsing.

## Supported Formats

The application supports the following file formats for resume uploads:

- **PDF** (`.pdf`): Portable Document Format
- **DOCX** (`.docx`): Microsoft Word Document
- **Text** (`.txt`): Plain text files
- **Markdown** (`.md`, `.markdown`): Markdown formatted text files

## Size Limits

- **Maximum File Size**: 10MB
- **Processing Timeout**: 30 seconds for synchronous parsing; longer tasks are handled via a background queue.

## Extraction Logic

1. **PDF**: Extracted using `pdf-parse`. Supports text-based PDFs. Scanned PDFs (images) are not supported.
2. **DOCX**: Extracted using `mammoth`. Extracts raw text while preserving basic structure.
3. **Text/Markdown**: Read directly using UTF-8 encoding.

## AI Parsing

After text extraction, the content is sent to the AI Engine for structured data extraction. The AI identifies:

- Personal Information (Name, Email, Phone, etc.)
- Education History
- Work Experience
- Skills
- Projects

## Troubleshooting

If a resume fails to parse:

1. **Check Format**: Ensure it's one of the supported formats.
2. **Check Size**: Ensure it's under 10MB.
3. **Check Content**: Ensure the file contains selectable text. If it's a scanned image, it will not be parsed correctly.
4. **Encoding**: Text files should be encoded in UTF-8.
5. **AI Response**: If the AI returns malformed data, the system attempts to recover the JSON structure automatically.

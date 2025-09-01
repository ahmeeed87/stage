# Image Templates

This directory contains SVG templates for generating certificates and payment receipts.

## Available Templates

### 1. `certificate-template.svg`
- **Purpose**: Template for generating training completion certificates
- **Format**: SVG vector graphics (scalable)
- **Customization**: Replace placeholder text in brackets `[PLACEHOLDER]` with actual data
- **Fields to customize**:
  - `[NOM_DU_CANDIDAT]` - Candidate's name
  - `[NOM_DE_LA_FORMATION]` - Training name
  - `[DURÉE]` - Training duration in hours
  - `[DATE_DE_FIN]` - Completion date
  - `[NUMÉRO_CERTIFICAT]` - Certificate number

### 2. `payment-receipt-template.svg`
- **Purpose**: Template for generating payment receipts
- **Format**: SVG vector graphics (scalable)
- **Customization**: Replace placeholder text in brackets `[PLACEHOLDER]` with actual data
- **Fields to customize**:
  - `[NUMÉRO_DE_RECU]` - Receipt number
  - `[DATE]` - Payment date
  - `[NOM_CANDIDAT]` - Candidate's name
  - `[FORMATION]` - Training name
  - `[MÉTHODE]` - Payment method
  - `[DESCRIPTION]` - Payment description
  - `[MONTANT]` - Payment amount

## Customization

### Replacing Placeholders
The templates use placeholder text in square brackets that should be replaced with actual data when generating documents.

### Modifying Design
- Edit the SVG files directly in any text editor or SVG editor
- Colors can be changed by modifying the `fill` and `stroke` attributes
- Fonts can be changed by modifying the `font-family` attributes
- Layout can be adjusted by modifying coordinates and dimensions

### Adding Your Logo
Replace the placeholder logo elements with your actual company logo:
- For certificates: Replace the circle with "LOGO" text
- For receipts: Add your logo in the header section

## Technical Notes

- SVG format ensures high quality at any size
- Templates are designed for A4/Letter paper dimensions
- All text elements use web-safe fonts for compatibility
- Templates include proper spacing and layout for professional appearance

## Usage in Application

These templates are used by the PDF generator utility (`src/utils/pdfGenerator.js`) to create final documents with actual data replacing the placeholders.

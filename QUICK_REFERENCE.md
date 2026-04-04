# Quick Reference Guide - Frontend Redesign

## 🚀 Quick Start

### Install & Run
```bash
cd frontend
npm install        # Install dependencies
npm run dev       # Start dev server (port 5173)
```

### Visit Local App
```
http://localhost:5173
```

---

## 📚 CSS Variables Quick Reference

### Use Colors
```css
/* Any CSS file can use these variables */
background-color: var(--bg-app);          /* #FAFAFA */
color: var(--text-primary);               /* #111827 */
border-color: var(--border-light);        /* #E5E7EB */

/* Semantic colors */
background-color: var(--success-bg);      /* Success background */
color: var(--error-text);                 /* Error text */
```

### Use Spacing
```css
margin: var(--space-4);                   /* 16px */
padding: var(--space-8);                  /* 32px */
gap: var(--space-2);                      /* 8px */
```

### Use Typography
```css
font-size: var(--font-h1);                /* 48px */
font-weight: var(--weight-bold);          /* 700 */
line-height: var(--line-height);          /* 1.5 */
```

---

## 🎨 Button Quick Reference

### HTML Usage
```html
<!-- Primary (Blue, Dominant) -->
<button class="btn-primary">Save</button>

<!-- Secondary (Outline) -->
<button class="btn-secondary">Cancel</button>

<!-- Ghost (Transparent) -->
<button class="btn-ghost">Learn More</button>

<!-- Danger (Red, Destructive) -->
<button class="btn-danger">Delete</button>
```

### React Usage
```jsx
<button className="btn-primary">Save</button>
<button className="btn-secondary" disabled>Cancel</button>
<button className="btn-danger" onClick={handleDelete}>Delete</button>
```

---

## 🎯 Icon Quick Reference

### Import Icons
```jsx
import { 
  CheckCircle,      // Checkmark circle
  X,                // X close button
  AlertCircle,      // Alert/warning icon
  Users,            // Multiple users
  Grid,             // Grid/dashboard icon
  Settings,         // Settings/gear
  LogOut,           // Logout arrow
  // ... and 10+ more available
} from '../icons/Icons'
```

### Use Icons
```jsx
// Default size (24px)
<CheckCircle />

// Custom size
<Users size={32} />

// With className
<Grid size={48} className="my-icon" />

// In buttons
<button>
  <Settings size={20} /> Settings
</button>
```

---

## 🏗️ Component Structure

### Card Component
```jsx
<div className="card">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</div>
```

### Modal Component
```jsx
<div className="modal-backdrop">
  <div className="modal-content">
    <div className="modal-header">
      <h2>Modal Title</h2>
      <button className="modal-close">×</button>
    </div>
    <div className="modal-body">
      Modal content here
    </div>
    <div className="modal-footer">
      <button className="btn-secondary">Cancel</button>
      <button className="btn-primary">Save</button>
    </div>
  </div>
</div>
```

### Tab Navigation
```jsx
<div className="tabs">
  <button className="tab active" onClick={...}>Tab 1</button>
  <button className="tab" onClick={...}>Tab 2</button>
  <button className="tab" onClick={...}>Tab 3</button>
</div>

<div className="tab-content active">Content 1</div>
<div className="tab-content">Content 2</div>
<div className="tab-content">Content 3</div>
```

### Table
```jsx
<div className="table-responsive">
  <table>
    <thead>
      <tr><th>Column 1</th><th>Column 2</th></tr>
    </thead>
    <tbody>
      <tr><td>Data</td><td>Data</td></tr>
    </tbody>
  </table>
</div>
```

### Alert Messages
```jsx
<div className="alert success">
  <div>Success message here</div>
  <button className="alert-close">×</button>
</div>

<div className="alert error">
  <div>Error message here</div>
</div>

<div className="alert warning">
  <div>Warning message here</div>
</div>
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
/* Base: Mobile (< 640px) */
/* 640px */   @media (min-width: 640px)  { ... }
/* 768px */   @media (min-width: 768px)  { ... }
/* 1024px */  @media (min-width: 1024px) { ... }
/* 1200px */  @media (min-width: 1200px) { ... }
/* 1400px */  @media (min-width: 1400px) { ... }
```

### Common patterns
```css
/* Responsive grid */
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
gap: var(--space-4);

/* Responsive flex */
display: flex;
flex-wrap: wrap;
gap: var(--space-3);

/* Hide on mobile */
@media (max-width: 768px) {
  .desktop-only { display: none; }
}

/* Adjust padding on mobile */
@media (max-width: 640px) {
  padding: var(--space-2); /* 8px instead of larger */
}
```

---

## 🎨 Color Usage Guide

### When to Use
```
Primary Text Color         → All body text, main content
Secondary Text Color       → Descriptions, metadata
Tertiary Text Color        → Placeholder, subtle text
Primary Background Color   → Page background
Surface Background Color   → Cards, containers
Hover Background Color     → Interactive elements

Success Color              → Positive actions, confirmations
Error Color                → Errors, destructive actions
Warning Color              → Warnings, cautions
```

### Examples
```css
/* Good - semantic usage */
.success-banner {
  background-color: var(--success-bg);
  color: var(--success-text);
  border-left: 4px solid var(--success-border);
}

.error-message {
  color: var(--error-text);
  font-size: var(--font-small);
}

/* Good - text hierarchy */
.card-title {
  color: var(--text-primary);      /* Most important */
  font-size: var(--font-h3);
}

.card-description {
  color: var(--text-secondary);    /* Important but secondary */
}

.card-meta {
  color: var(--text-tertiary);     /* Least important */
  font-size: var(--font-small);
}
```

---

## ✨ Animation Quick Reference

### Predefined Animations
```css
/* Slide up animation */
animation: slideUp 300ms ease-out;

/* Slide down animation */
animation: slideDown 300ms ease-out;

/* Fade in animation */
animation: fadeIn 200ms ease-in;
```

### Usage Examples
```css
.modal-content {
  animation: slideUp 300ms ease-out;
}

.toast-message {
  animation: slideDown 300ms ease-out;
}

.page-load {
  animation: fadeIn 200ms ease-in;
}
```

---

## 🔍 Debugging Tips

### Check CSS Variables
```javascript
// In browser console
getComputedStyle(document.documentElement).getPropertyValue('--bg-app')
// Should return: " #fafafa"
```

### Verify Icon Size
```javascript
// Check if icon SVG is rendering
document.querySelector('svg')
// Should show SVG element with proper width/height
```

### Test Responsiveness
```javascript
// Check current viewport width
window.innerWidth
// Resize window and check CSS media queries activate
```

---

## 📦 Production Build

### Build for Production
```bash
npm run build
```

### Output Location
```
frontend/dist/
├── index.html
├── assets/
│   ├── index-XXX.js    (minified & bundled)
│   ├── index-XXX.css   (minified styles)
│   └── ...other assets
```

### Deploy the dist folder
- Upload entire `frontend/dist/` folder to hosting
- Point domain to `dist/index.html`
- Build is optimized and minified

---

## 🎯 File Organization

### Add a new page
```
1. Create: src/pages/NewPage.jsx
2. Create: src/pages/NewPage.css
3. Import index.css in NewPage.jsx
4. Use CSS classes from global system
5. Update App.jsx routes
```

### Add a new component
```
1. Create: src/components/NewComponent.jsx
2. Create: src/components/styles/NewComponent.css
3. Import Icons from '../icons/Icons'
4. Use CSS variables and classes
5. Export default component
```

### Add a new icon
```
1. Open: src/icons/Icons.jsx
2. Add new export const function
3. Write SVG code (16-24px viewBox)
4. Set strokeWidth="1.5"
5. Export and use in components
```

---

## 🐛 Common Issues & Solutions

### Issue: Icons not showing
**Solution**: Check import path
```jsx
// ✅ Correct
import { CheckCircle } from '../icons/Icons'

// ❌ Wrong
import { CheckCircle } from './Icons'  // missing ..
```

### Issue: Colors look wrong
**Solution**: Check CSS variable name
```css
/* ✅ Correct */
color: var(--text-primary);

/* ❌ Wrong */
color: var(--primary-text);  /* Wrong order */
```

### Issue: Responsive layout broken
**Solution**: Check media query order
```css
/* ✅ Correct - mobile first */
.box { width: 100%; }
@media (min-width: 768px) { .box { width: 50%; } }

/* ❌ Wrong - media query overridden */
@media (min-width: 768px) { .box { width: 50%; } }
.box { width: 100%; }  /* This overrides above */
```

---

## 📚 Documentation Files

1. **FRONTEND_REDESIGN_COMPLETE.md** 
   - Comprehensive design system documentation
   - Full implementation details
   - Build instructions

2. **FRONTEND_COMPLETE.md**
   - Quick summary
   - Key features
   - Deployment status

3. **MIGRATION_CHECKLIST.md**
   - Detailed checklist of all changes
   - Statistics and metrics
   - Verification steps

---

## ✅ Your Checklist

- [ ] Install dependencies: `npm install`
- [ ] Run dev server: `npm run dev`
- [ ] Visit: `http://localhost:5173`
- [ ] Test all pages load
- [ ] Test responsive design (resize browser)
- [ ] Test buttons and forms
- [ ] Check browser console (should be clean)
- [ ] Build for production: `npm run build`
- [ ] Review dist folder created
- [ ] Ready to deploy!

---

**Quick Links**
- Local Dev: http://localhost:5173
- Full Docs: FRONTEND_REDESIGN_COMPLETE.md
- Checklist: MIGRATION_CHECKLIST.md
- CSS Variables: src/index.css
- Icons: src/icons/Icons.jsx

**Status**: Ready for Production ✅

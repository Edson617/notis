/**
 * Script para generar iconos PNG a partir del SVG base
 * 
 * Requisitos: npm install sharp
 * Uso: node generate-icons.js
 * 
 * Alternativa sin Node.js:
 * Puedes usar herramientas online como:
 * - https://favicon.io/favicon-converter/
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 */

const fs = require('fs');
const path = require('path');

// Si tienes sharp instalado, descomenta el código siguiente:
/*
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, 'icons', 'icon.svg');
const iconsDir = path.join(__dirname, 'icons');

async function generateIcons() {
    console.log('Generando iconos PWA...');
    
    for (const size of sizes) {
        const outputPath = path.join(iconsDir, `icon-${size}.png`);
        
        await sharp(svgPath)
            .resize(size, size)
            .png()
            .toFile(outputPath);
            
        console.log(`✓ Generado: icon-${size}.png`);
    }
    
    console.log('\n¡Todos los iconos generados correctamente!');
}

generateIcons().catch(console.error);
*/

// Versión sin sharp - genera archivos placeholder con instrucciones
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'icons');

// Asegurar que existe el directorio
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Crear SVG básico para cada tamaño (los navegadores modernos pueden usarlos)
const createSvgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560"/>
      <stop offset="100%" style="stop-color:#533483"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <g transform="translate(${size/2}, ${size/2}) scale(${size/128})">
    <path d="M0 -40C-6.6 -40 -12 -34.6 -12 -28V-24.3C-18.5 -21.2 -24 -16.3 -24 -8V12L-32 20V24H32V20L24 12V-8C24 -16.3 18.5 -21.2 12 -24.3V-28C12 -34.6 6.6 -40 0 -40Z" fill="white"/>
    <path d="M0 40C6.6 40 12 34.6 12 28H-12C-12 34.6 -6.6 40 0 40Z" fill="white"/>
  </g>
</svg>`;

console.log('Generando iconos SVG para PWA...\n');

sizes.forEach(size => {
    const svgContent = createSvgIcon(size);
    const svgPath = path.join(iconsDir, `icon-${size}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✓ Generado: icon-${size}.svg`);
});

console.log('\n========================================');
console.log('NOTA IMPORTANTE:');
console.log('========================================');
console.log('Para mejor compatibilidad, convierte los SVG a PNG usando:');
console.log('');
console.log('Opción 1: Instalar sharp y ejecutar el script completo:');
console.log('  npm install sharp');
console.log('  (descomenta el código en generate-icons.js)');
console.log('  node generate-icons.js');
console.log('');
console.log('Opción 2: Usar herramientas online:');
console.log('  - https://favicon.io/favicon-converter/');
console.log('  - https://realfavicongenerator.net/');
console.log('  - https://www.pwabuilder.com/imageGenerator');
console.log('');
console.log('Por ahora, los SVG funcionarán en navegadores modernos.');
console.log('========================================\n');


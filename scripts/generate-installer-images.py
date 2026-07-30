"""
Genera imagenes personalizadas para el instalador NSIS de STBlock
- Header: 150x57 px
- Sidebar: 164x314 px
Paleta: Verde STBlock (#4CAF50) y Blanco
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Colores STBlock
GREEN = (76, 175, 80)       # #4CAF50
DARK_GREEN = (46, 125, 50)  # #2E7D32
WHITE = (255, 255, 255)
LIGHT_GRAY = (245, 245, 245)

ICONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'src-tauri', 'icons')

def create_gradient(width, height, color1, color2, vertical=True):
    """Crea un degradado entre dos colores"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)

    for i in range(height if vertical else width):
        ratio = i / (height if vertical else width)
        r = int(color1[0] + (color2[0] - color1[0]) * ratio)
        g = int(color1[1] + (color2[1] - color1[1]) * ratio)
        b = int(color1[2] + (color2[2] - color1[2]) * ratio)

        if vertical:
            draw.line([(0, i), (width, i)], fill=(r, g, b))
        else:
            draw.line([(i, 0), (i, height)], fill=(r, g, b))

    return img

def create_header():
    """Crea la imagen del header (150x57)"""
    width, height = 150, 57

    # Fondo degradado verde
    img = create_gradient(width, height, WHITE, LIGHT_GRAY, vertical=True)
    draw = ImageDraw.Draw(img)

    # Cargar y redimensionar el logo
    logo_path = os.path.join(ICONS_DIR, 'icon.png')
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert('RGBA')
        logo_size = 45
        logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

        # Posicionar logo a la izquierda
        logo_x = 5
        logo_y = (height - logo_size) // 2

        # Pegar logo con transparencia
        img.paste(logo, (logo_x, logo_y), logo)

    # Agregar texto "STBlock"
    try:
        font = ImageFont.truetype("arial.ttf", 20)
        font_small = ImageFont.truetype("arial.ttf", 10)
    except:
        font = ImageFont.load_default()
        font_small = font

    draw.text((55, 12), "STBlock", fill=GREEN, font=font)
    draw.text((55, 35), "Programacion Visual", fill=(100, 100, 100), font=font_small)

    # Linea decorativa verde en la parte inferior
    draw.rectangle([(0, height-3), (width, height)], fill=GREEN)

    return img

def create_sidebar():
    """Crea la imagen del sidebar (164x314)"""
    width, height = 164, 314

    # Fondo degradado verde
    img = create_gradient(width, height, GREEN, DARK_GREEN, vertical=True)
    draw = ImageDraw.Draw(img)

    # Cargar y redimensionar el logo
    logo_path = os.path.join(ICONS_DIR, 'icon.png')
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert('RGBA')
        logo_size = 100
        logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

        # Centrar logo
        logo_x = (width - logo_size) // 2
        logo_y = 40

        # Crear fondo blanco circular para el logo
        circle_size = logo_size + 20
        circle_x = (width - circle_size) // 2
        circle_y = logo_y - 10
        draw.ellipse([circle_x, circle_y, circle_x + circle_size, circle_y + circle_size],
                     fill=WHITE)

        # Pegar logo
        img.paste(logo, (logo_x, logo_y), logo)

    # Textos
    try:
        font_title = ImageFont.truetype("arial.ttf", 18)
        font_sub = ImageFont.truetype("arial.ttf", 11)
        font_small = ImageFont.truetype("arial.ttf", 9)
    except:
        font_title = ImageFont.load_default()
        font_sub = font_title
        font_small = font_title

    # Titulo centrado
    title = "STBlock"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    text_width = bbox[2] - bbox[0]
    draw.text(((width - text_width) // 2, 165), title, fill=WHITE, font=font_title)

    # Subtitulo
    sub = "Instalador"
    bbox = draw.textbbox((0, 0), sub, font=font_sub)
    text_width = bbox[2] - bbox[0]
    draw.text(((width - text_width) // 2, 190), sub, fill=(220, 255, 220), font=font_sub)

    # Linea decorativa
    line_y = 220
    draw.line([(20, line_y), (width-20, line_y)], fill=(255, 255, 255, 128), width=1)

    # Caracteristicas
    features = [
        "Programacion Visual",
        "Electronica Educativa",
        "Robotica",
        "Compatible Arduino"
    ]

    y_pos = 235
    for feature in features:
        # Bullet point
        draw.ellipse([(15, y_pos+3), (21, y_pos+9)], fill=WHITE)
        draw.text((28, y_pos), feature, fill=WHITE, font=font_small)
        y_pos += 18

    return img

def main():
    print("Generando imagenes del instalador STBlock...")

    # Crear header
    header = create_header()
    header_path = os.path.join(ICONS_DIR, 'nsis-header.bmp')
    header.save(header_path, 'BMP')
    print(f"OK: Header guardado en {header_path}")

    # Crear sidebar
    sidebar = create_sidebar()
    sidebar_path = os.path.join(ICONS_DIR, 'nsis-sidebar.bmp')
    sidebar.save(sidebar_path, 'BMP')
    print(f"OK: Sidebar guardado en {sidebar_path}")

    print("\nImagenes generadas exitosamente!")
    print("Ejecuta 'pnpm deploy:all' para ver el nuevo instalador.")

if __name__ == '__main__':
    main()

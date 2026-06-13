from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
NORMAL_DIR = ROOT / "测试照片" / "普通体积"
LARGE_DIR = ROOT / "测试照片" / "大图压测"


PALETTE = {
    "wall": "#f4f1e8",
    "floor": "#c9b08c",
    "wood": "#8e6d4e",
    "dark": "#25352f",
    "green": "#597d54",
    "blue": "#748b9b",
    "warm": "#e7c98e",
    "line": "#54645c",
    "alert": "#b86b4b",
    "soft": "#dfe7d8",
}


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for item in candidates:
        path = Path(item)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def rounded(draw: ImageDraw.ImageDraw, xy, fill, outline=None, radius=20, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def label(draw: ImageDraw.ImageDraw, xy, text: str, fill=PALETTE["dark"], size=34):
    draw.text(xy, text, fill=fill, font=font(size))


def arrow(draw: ImageDraw.ImageDraw, start, end, fill=PALETTE["alert"], width=10):
    draw.line([start, end], fill=fill, width=width)
    ex, ey = end
    sx, sy = start
    dx = 1 if ex >= sx else -1
    dy = 1 if ey >= sy else -1
    draw.polygon([(ex, ey), (ex - 28 * dx, ey - 14), (ex - 28 * dx, ey + 14)], fill=fill)
    if abs(ey - sy) > abs(ex - sx):
        draw.polygon([(ex, ey), (ex - 14, ey - 28 * dy), (ex + 14, ey - 28 * dy)], fill=fill)


def base_room(title: str, subtitle: str, size=(1600, 1100)) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", size, PALETTE["wall"])
    draw = ImageDraw.Draw(img)
    w, h = size
    draw.rectangle([0, int(h * 0.62), w, h], fill=PALETTE["floor"])
    for x in range(0, w, 120):
        draw.line([(x, int(h * 0.62)), (x - 160, h)], fill="#b89c78", width=2)
    for y in range(int(h * 0.66), h, 95):
        draw.line([(0, y), (w, y)], fill="#b89c78", width=2)
    label(draw, (42, 34), title, size=44)
    label(draw, (42, 92), subtitle, fill=PALETTE["line"], size=26)
    draw.rectangle([0, 0, w - 1, h - 1], outline="#ded8ca", width=6)
    return img, draw


def add_window(draw, x, y, w=290, h=230, light=True):
    rounded(draw, [x, y, x + w, y + h], fill="#f7fbff" if light else "#cfd7d2", outline=PALETTE["line"], radius=8, width=4)
    draw.line([(x + w / 2, y), (x + w / 2, y + h)], fill=PALETTE["line"], width=3)
    draw.line([(x, y + h / 2), (x + w, y + h / 2)], fill=PALETTE["line"], width=3)
    if light:
        draw.polygon([(x + 30, y + h), (x + w - 30, y + h), (x + w + 180, y + h + 330), (x - 180, y + h + 330)], fill="#f2dfaa")


def add_door(draw, x, y, w=180, h=360):
    rounded(draw, [x, y, x + w, y + h], fill="#805d44", outline=PALETTE["dark"], radius=5, width=4)
    draw.ellipse([x + w - 42, y + h / 2 - 10, x + w - 22, y + h / 2 + 10], fill=PALETTE["warm"])


def add_sofa(draw, x, y, w=520, h=190):
    rounded(draw, [x, y, x + w, y + h], fill=PALETTE["green"], radius=32)
    rounded(draw, [x + 38, y - 72, x + w - 38, y + 34], fill="#6f9168", radius=24)
    draw.rectangle([x + 45, y + h, x + 95, y + h + 55], fill=PALETTE["dark"])
    draw.rectangle([x + w - 95, y + h, x + w - 45, y + h + 55], fill=PALETTE["dark"])


def add_bed(draw, x, y, w=540, h=380, headboard=True):
    if headboard:
        rounded(draw, [x - 28, y - 65, x + w + 28, y + 20], fill=PALETTE["wood"], radius=18)
    rounded(draw, [x, y, x + w, y + h], fill="#e7dfcf", outline=PALETTE["wood"], radius=28, width=5)
    draw.rectangle([x + 42, y + 46, x + w - 42, y + 170], fill="#f8f5ec")
    rounded(draw, [x + 55, y + 64, x + 210, y + 150], fill="#d6e1cf", radius=16)
    rounded(draw, [x + w - 210, y + 64, x + w - 55, y + 150], fill="#d6e1cf", radius=16)


def add_table(draw, x, y, w=260, h=125):
    rounded(draw, [x, y, x + w, y + h], fill=PALETTE["warm"], outline="#ae8d57", radius=55, width=4)


def add_cabinet(draw, x, y, w=420, h=170):
    rounded(draw, [x, y, x + w, y + h], fill=PALETTE["dark"], radius=18)
    for i in range(1, 4):
        draw.line([(x + i * w / 4, y + 20), (x + i * w / 4, y + h - 20)], fill="#40524a", width=3)


def add_kitchen(draw, x, y):
    rounded(draw, [x, y, x + 780, y + 260], fill="#e6e1d5", outline=PALETTE["line"], radius=20, width=4)
    draw.rectangle([x + 50, y + 70, x + 245, y + 180], fill="#becdd2", outline=PALETTE["line"], width=3)
    draw.ellipse([x + 445, y + 80, x + 545, y + 180], outline=PALETTE["dark"], width=6)
    draw.ellipse([x + 565, y + 80, x + 665, y + 180], outline=PALETTE["dark"], width=6)
    label(draw, (x + 80, y + 190), "水槽", size=24)
    label(draw, (x + 505, y + 190), "灶台", size=24)


def add_mirror(draw, x, y, w=160, h=280):
    rounded(draw, [x, y, x + w, y + h], fill="#dbe8ed", outline=PALETTE["blue"], radius=18, width=5)
    draw.line([(x + 28, y + 28), (x + w - 28, y + h - 28)], fill="#eef6f8", width=8)


def create_scenes(target: Path, size=(1600, 1100), quality=88):
    target.mkdir(parents=True, exist_ok=True)
    scenes = []

    img, draw = base_room("01 客厅：入户直见阳台", "测试门窗直线、沙发靠山、明堂空间", size)
    add_door(draw, 80, 360)
    add_window(draw, size[0] - 430, 150)
    add_sofa(draw, 410, 700)
    add_table(draw, 720, 760)
    add_cabinet(draw, 920, 650)
    arrow(draw, (240, 540), (size[0] - 450, 440))
    label(draw, (310, 500), "直线动线", PALETTE["alert"], 28)
    scenes.append(("01_客厅_入户直见阳台_测门冲动线.jpg", img))

    img, draw = base_room("02 客厅：沙发背后空", "测试沙发无靠、走道穿行、视觉安全感", size)
    add_window(draw, 1050, 120)
    add_sofa(draw, 520, 660)
    add_table(draw, 720, 820)
    arrow(draw, (210, 845), (1320, 845))
    label(draw, (470, 585), "沙发背后是走道", PALETTE["alert"], 30)
    scenes.append(("02_客厅_沙发背后空_测靠山.jpg", img))

    img, draw = base_room("03 卧室：床尾对门", "测试门冲床、床头靠墙、睡眠压迫感", size)
    add_door(draw, 80, 380)
    add_window(draw, 1120, 140)
    add_bed(draw, 520, 520)
    arrow(draw, (250, 560), (785, 820))
    label(draw, (330, 500), "门冲床尾", PALETTE["alert"], 32)
    scenes.append(("03_卧室_床尾对门_测睡眠.jpg", img))

    img, draw = base_room("04 卧室：镜子对床", "测试镜面对床、夜间反光、视觉刺激", size)
    add_bed(draw, 450, 530)
    add_mirror(draw, 1160, 410)
    arrow(draw, (1150, 550), (900, 700))
    label(draw, (1080, 720), "镜面对床", PALETTE["alert"], 32)
    scenes.append(("04_卧室_镜子对床_测反光.jpg", img))

    img, draw = base_room("05 卧室：床头靠窗", "测试床头无实靠、窗边冷风和噪声", size)
    add_window(draw, 520, 95, 520, 250)
    add_bed(draw, 510, 410, headboard=False)
    label(draw, (560, 350), "床头靠窗", PALETTE["alert"], 32)
    scenes.append(("05_卧室_床头靠窗_测靠山.jpg", img))

    img, draw = base_room("06 厨房：灶水相邻", "测试水火距离、备餐动线、油烟路径", size)
    add_kitchen(draw, 370, 520)
    arrow(draw, (610, 660), (840, 660))
    label(draw, (615, 460), "水槽与灶台过近", PALETTE["alert"], 32)
    scenes.append(("06_厨房_灶水相邻_测水火.jpg", img))

    img, draw = base_room("07 厨房：灶口正对门", "测试强风直吹灶台、操作安全", size)
    add_door(draw, 90, 360)
    add_kitchen(draw, 620, 540)
    arrow(draw, (250, 560), (1050, 650))
    label(draw, (430, 485), "门风直冲灶台", PALETTE["alert"], 30)
    scenes.append(("07_厨房_灶口对门_测安全.jpg", img))

    img, draw = base_room("08 玄关：一眼穿到底", "测试入户缓冲、收纳和隐私", size)
    add_door(draw, 70, 350)
    add_window(draw, 1180, 160)
    add_cabinet(draw, 360, 680, 300, 180)
    arrow(draw, (250, 540), (1180, 470))
    label(draw, (550, 505), "缺少缓冲", PALETTE["alert"], 32)
    scenes.append(("08_玄关_一眼穿到底_测缓冲.jpg", img))

    img, draw = base_room("09 卫生间：潮湿暗区", "测试湿气、通风、采光和防滑", size)
    add_window(draw, 1050, 130, 250, 190, light=False)
    rounded(draw, [350, 610, 660, 840], fill="#d9e3e3", outline=PALETTE["line"], radius=26, width=4)
    rounded(draw, [790, 540, 1040, 860], fill="#f5f2ea", outline=PALETTE["line"], radius=35, width=4)
    label(draw, (690, 420), "采光弱、湿气重", PALETTE["alert"], 34)
    scenes.append(("09_卫生间_潮湿暗区_测通风.jpg", img))

    img, draw = base_room("10 书房：屏幕正对窗", "测试眩光、专注和书桌背后稳定", size)
    add_window(draw, 980, 120, 360, 250)
    rounded(draw, [480, 690, 950, 830], fill=PALETTE["wood"], radius=18)
    rounded(draw, [650, 500, 790, 690], fill=PALETTE["blue"], radius=10)
    arrow(draw, (1100, 400), (730, 570))
    label(draw, (465, 455), "窗光直射屏幕", PALETTE["alert"], 32)
    scenes.append(("10_书房_屏幕对窗_测眩光.jpg", img))

    img, draw = base_room("11 阳台：杂物堆积", "测试气口阻塞、采光和收纳压力", size)
    add_window(draw, 180, 110, size[0] - 360, 300)
    for i, x in enumerate([360, 510, 690, 850, 1040]):
      rounded(draw, [x, 650 - i * 20, x + 140, 900], fill=["#8b6c4e", "#6e7f8d", "#b8895f", "#55775a", "#9b6a58"][i], radius=12)
    label(draw, (540, 520), "窗边堆物，影响采光通风", PALETTE["alert"], 32)
    scenes.append(("11_阳台_杂物堆积_测收纳.jpg", img))

    img, draw = base_room("12 整屋：多问题综合", "测试整屋模式、多个空间问题混合输入", size)
    add_door(draw, 70, 360)
    add_window(draw, 1160, 120)
    add_sofa(draw, 390, 700, 430, 160)
    add_bed(draw, 850, 575, 400, 270, headboard=False)
    add_mirror(draw, 1320, 460, 120, 230)
    arrow(draw, (245, 540), (1160, 440))
    label(draw, (430, 505), "综合：门窗直线 + 床头弱 + 镜面", PALETTE["alert"], 28)
    scenes.append(("12_整屋_多问题综合_测报告稳定性.jpg", img))

    for name, image in scenes:
      if size[0] > 2000:
        noise = Image.effect_noise(image.size, 58).convert("RGB")
        noise = ImageChops.multiply(noise, Image.new("RGB", image.size, "#f0f0f0"))
        image = Image.blend(image, noise, 0.16)
        image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=3))
      image.save(target / name, "JPEG", quality=quality, optimize=True)


if __name__ == "__main__":
    create_scenes(NORMAL_DIR, size=(1600, 1100), quality=88)
    create_scenes(LARGE_DIR, size=(3600, 2500), quality=94)
    print(f"Generated test photos in: {ROOT / '测试照片'}")

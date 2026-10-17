"""
Generates public/grades/phoenix-flat, flat vector versions of the Phoenix grade images in public/grades/phoenix:
one soft color per grade family, fails drawn as outlines, A grades as wide as S grades.

Run from the repo root: python3 packages/web/scripts/grades/generate.py
Needs fontTools and the Fira Sans Heavy Italic font (OFL)
"""

from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT = '/usr/share/fonts/TTF/FiraSans-HeavyItalic.ttf'
TARGET_DIR = Path(__file__).resolve().parents[2] / 'public' / 'grades' / 'phoenix-flat'

GRADES = ['SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', 'AAA+', 'AAA', 'AA+', 'AA', 'A+', 'A', 'B', 'C', 'D', 'F']

# The original images group grades in families by material, these are the same families with the color mostly taken out
FAMILY_COLORS = {
    'SSS': '#9cc9dc',  # ice blue
    'S': '#d6c699',  # gold
    'A': '#bcc2cb',  # silver (AAA, AA)
    'A1': '#c4946c',  # bronze (single A)
    'B': '#8fb8a6',  # green (B, C, D, F)
}
FAIL_COLOR = '#8a8a8a'


def family_of(grade: str) -> str:
    letters = grade.rstrip('+')
    if letters.startswith('SSS'):
        return 'SSS'
    if letters.startswith('S'):
        return 'S'
    if letters in ('AAA', 'AA'):
        return 'A'
    if letters == 'A':
        return 'A1'
    return 'B'


font = TTFont(FONT)
glyph_set = font.getGlyphSet()
cmap = font.getBestCmap()
CAP_HEIGHT = font['OS/2'].sCapHeight

# All sizes are in font units
PADDING = 24  # room for the fail outlines
GAP = 50  # width of the cut between overlapping letters
PLUS_SCALE = 0.6
OUTLINE = 44  # stroke width of the fail outlines
S_OVERLAP = 0.34  # how much of a repeated S hides behind the one in front of it, A's overlap as much as a_overlap_for() says
PLUS_TUCK = 0.24  # how far the plus moves into the last letter, as a part of the letter width
BASELINE = PADDING + CAP_HEIGHT
HEIGHT = CAP_HEIGHT + PADDING * 2
# A is open at the bottom, so a letter behind it would show through between its legs:
# it cuts the letters behind it with its outer shape (convex hull) instead of its outline
CUT_WITH_HULL = 'A'


def convex_hull(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Andrew's monotone chain"""
    points = sorted(set(points))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def half(points):
        result = []
        for point in points:
            while len(result) >= 2 and cross(result[-2], result[-1], point) <= 0:
                result.pop()
            result.append(point)
        return result[:-1]

    return half(points) + half(list(reversed(points)))


def glyph_path(char: str, x: float, y: float, scale: float = 1):
    """SVG path of one character with its baseline at y, the path that cuts the letters behind it,
    its advance width, and its left and right edges"""
    glyph = glyph_set[cmap[ord(char)]]
    # Font units go up, SVG goes down: flip y around the baseline
    transform = (scale, 0, 0, -scale, x, y)
    pen = SVGPathPen(glyph_set)
    glyph.draw(TransformPen(pen, transform))
    path = pen.getCommands()
    bounds = BoundsPen(glyph_set)
    glyph.draw(TransformPen(bounds, transform))
    left, _, right, _ = bounds.bounds

    cut = path
    if char in CUT_WITH_HULL:
        recording = RecordingPen()
        glyph.draw(TransformPen(recording, transform))
        points = [point for _, args in recording.value for point in args]
        cut = 'M' + ' L'.join(f'{px:.1f} {py:.1f}' for px, py in convex_hull(points)) + 'Z'
    return path, cut, glyph.width * scale, left, right


def letter_layout(grade: str, a_overlap: float):
    """Paths and cuts of the letters, front first, then of the plus (if any), and the left and right edges of the grade"""
    letters = grade.rstrip('+')
    overlap = {'S': S_OVERLAP, 'A': a_overlap}
    x = 0
    letter_shapes = []
    left = right = 0
    for char in letters:
        path, cut, advance, letter_left, letter_right = glyph_path(char, x, BASELINE)
        letter_shapes.append((path, cut))
        left = min(left, letter_left)
        right = max(right, letter_right)
        x += advance * (1 - overlap.get(char, 0))
    x += advance * overlap.get(char, 0)
    plus = None
    if grade.endswith('+'):
        # A small plus raised to the cap height, tucked into the last letter
        plus_x = x - advance * PLUS_TUCK
        plus_y = BASELINE - CAP_HEIGHT * 0.42
        path, cut, _, _, plus_right = glyph_path('+', plus_x, plus_y, PLUS_SCALE)
        plus = (path, cut)
        right = max(right, plus_right)
    return letter_shapes, plus, left, right


def a_overlap_for(grade: str) -> float:
    """The overlap of the A's that makes AAA as wide as SSS, AA+ as SS+ and so on"""
    if grade.count('A') < 2:
        return 0

    def width(a_overlap: float) -> float:
        _, _, left, right = letter_layout(grade, a_overlap)
        return right - left

    _, _, left, right = letter_layout(grade.replace('A', 'S'), 0)
    target = right - left
    # The grade gets narrower with more overlap: find the overlap that hits the target by halving the range
    low, high = 0, 1
    for _ in range(30):
        middle = (low + high) / 2
        if width(middle) > target:
            low = middle
        else:
            high = middle
    return high


def make_svg(grade: str, color: str, is_pass: bool) -> str:
    letter_shapes, plus, left, right = letter_layout(grade, a_overlap_for(grade))
    view_x = left - PADDING
    width = right - left + PADDING * 2
    if is_pass:
        paint = f'fill="{color}"'
    else:
        paint = f'fill="none" stroke="{color}" stroke-width="{OUTLINE}" stroke-linejoin="round"'

    # Draw from the back (last letter) to the front (first letter, then the plus);
    # every shape is cut by a gap around all the shapes in front of it
    front_to_back = ([plus] if plus else []) + letter_shapes
    defs = []
    body = []
    for index in reversed(range(len(front_to_back))):
        path = front_to_back[index][0]
        in_front = front_to_back[:index]
        if in_front:
            mask_id = f'm{index}'
            cuts = ''.join(
                f'<path d="{cut}" fill="black" stroke="black" stroke-width="{GAP * 2}" stroke-linejoin="round"/>'
                for _, cut in in_front
            )
            defs.append(
                f'<mask id="{mask_id}" maskUnits="userSpaceOnUse" x="{view_x:.0f}" y="0" width="{width:.0f}" height="{HEIGHT}">'
                f'<rect x="{view_x:.0f}" width="{width:.0f}" height="{HEIGHT}" fill="white"/>{cuts}</mask>'
            )
            body.append(f'<path d="{path}" {paint} mask="url(#{mask_id})"/>')
        else:
            body.append(f'<path d="{path}" {paint}/>')

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_x:.0f} 0 {width:.0f} {HEIGHT}">'
        f'<defs>{"".join(defs)}</defs>{"".join(body)}</svg>\n'
    )


for grade in GRADES:
    for is_pass in (True, False):
        target = TARGET_DIR / ('' if is_pass else 'fail') / f'{grade}.svg'
        target.parent.mkdir(parents=True, exist_ok=True)
        color = FAMILY_COLORS[family_of(grade)] if is_pass else FAIL_COLOR
        target.write_text(make_svg(grade, color, is_pass))

from pathlib import Path
from glob import glob
from panel.config import config

for cssf in glob(str(Path(__file__).parent / "dist" / "css" / "*.css")):
    if not cssf in config.css_files:
        config.css_files.append(cssf)

from .panes import ParallelCoordinatePane as ParallelCoordinates
from .widgets import MultiSelect

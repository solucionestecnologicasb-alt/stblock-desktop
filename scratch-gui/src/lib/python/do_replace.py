
import sys
sys.stdout.reconfigure(encoding='utf-8')
fp = "C:/Users/bello/Downloads/NewSkeleton-master/NewSkeleton-master/scratch-gui/src/lib/python/python-to-blocks.js"
with open(fp, 'r', encoding='utf-8') as f:
    content = f.read()
print("Read:", len(content), "chars")

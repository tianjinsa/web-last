# Python 后端开发指南

Python 是一种强大的编程语言，特别适合 Web 开发。

## Flask 框架

Flask 是一个轻量级的 Web 框架。

```python
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello World!"
```

## 部署

可以使用 Gunicorn 或 uWSGI 进行部署。

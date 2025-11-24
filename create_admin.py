from backend.app import app, db
from backend.models import User

def create_admin(username, password):
    with app.app_context():
        # 检查用户是否存在
        user = User.query.filter_by(username=username).first()
        
        if user:
            print(f"用户 '{username}' 已存在，正在更新为管理员...")
            user.is_admin = True
            user.is_approved = True
            user.set_password(password)
        else:
            print(f"正在创建新管理员用户 '{username}'...")
            user = User(username=username, is_admin=True, is_approved=True)
            user.set_password(password)
            db.session.add(user)
        
        db.session.commit()
        print(f"成功！用户 '{username}' 现在是管理员，密码已设置。")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("用法: python create_admin.py <username> <password>")
        print("示例: python create_admin.py admin 123456")
    else:
        create_admin(sys.argv[1], sys.argv[2])

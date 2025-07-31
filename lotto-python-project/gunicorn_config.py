# gunicorn_config.py

# 워커 타임아웃을 120초로 설정
timeout = 120
# 워커 프로세스 개수 (보통 CPU 코어 수의 2배 정도. 무료 티어는 1개가 최대일 수도)
workers = 1 
# 서버가 바인딩할 주소와 포트 (Render는 자동으로 설정해줌. 이 값은 Render에서 무시될 수 있음)
bind = "0.0.0.0:8000"
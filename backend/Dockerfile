FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies manually
RUN pip install --no-cache-dir \
    flask \
    flask-cors \
    flask-pymongo \  
    gunicorn \
    pymongo \
    APScheduler \
    python-dotenv \
    python-dateutil \
    requests

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
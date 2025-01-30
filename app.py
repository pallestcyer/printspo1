import os
from bs4 import BeautifulSoup
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def scrape_pinterest_board(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all image containers
        image_elements = soup.find_all('img', {'class': 'hCL kVc L4E MIw'})

        images = []
        for img in image_elements[:20]:  # Limit to 20 images
            if 'src' in img.attrs:
                images.append({
                    'url': img['src'],
                    'alt': img.get('alt', ''),
                    'width': img.get('width', ''),
                    'height': img.get('height', '')
                })

        return images
    except Exception as e:
        print(f"Error scraping Pinterest board: {e}")
        return []


@app.route("/")
def hello():
    return "Pinterest Scraping Service"


@app.route("/api/scrape-pinterest", methods=['POST'])
def handle_scrape_request():
    data = request.json
    url = data.get('url')

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    images = scrape_pinterest_board(url)
    return jsonify({'images': images})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

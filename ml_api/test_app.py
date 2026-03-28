import pytest
import json
from app import app as flask_app


@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as client:
        yield client


def test_health(client):
    resp = client.get('/')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


def test_predict_invalid_shooter_left_right(client):
    payload = {'shooterLeftRight': 'X', 'playerPositionThatDidEvent': 'C',
               'shooterTimeOnIceSinceFaceoff': 5.0}
    resp = client.post('/predict', json=payload)
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_predict_invalid_position(client):
    payload = {'shooterLeftRight': 'L', 'playerPositionThatDidEvent': 'G',
               'shooterTimeOnIceSinceFaceoff': 5.0}
    resp = client.post('/predict', json=payload)
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_predict_negative_time_on_ice(client):
    payload = {'shooterLeftRight': 'L', 'playerPositionThatDidEvent': 'C',
               'shooterTimeOnIceSinceFaceoff': -1.0}
    resp = client.post('/predict', json=payload)
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False

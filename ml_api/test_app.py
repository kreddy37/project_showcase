import pytest
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


def test_predict_missing_field(client):
    # Missing shooterLeftRight key entirely should return 400
    payload = {'playerPositionThatDidEvent': 'C', 'shooterTimeOnIceSinceFaceoff': 5.0}
    resp = client.post('/predict', json=payload)
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_predict_no_body(client):
    # Non-JSON body should return 400 with clear error
    resp = client.post('/predict', data='not json', content_type='text/plain')
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_predict_success(client):
    # Valid full payload should return 200 with a prediction
    payload = {
        'timeSinceLastEvent': 3.5,
        'xCord': 75.0,
        'yCord': 5.0,
        'shotAngle': 15.0,
        'shotAnglePlusRebound': 0.0,
        'shotAngleReboundRoyalRoad': 0,
        'shotDistance': 25.5,
        'shotType': 'WRIST',
        'shotRebound': 0,
        'shotAnglePlusReboundSpeed': 0.0,
        'shotRush': 0,
        'speedFromLastEvent': 8.0,
        'lastEventxCord': 60.0,
        'lastEventyCord': 0.0,
        'distanceFromLastEvent': 15.0,
        'lastEventShotAngle': 10.0,
        'lastEventShotDistance': 40.0,
        'lastEventCategory': 'SHOT',
        'offWing': 0,
        'shooterLeftRight': 'R',
        'playerPositionThatDidEvent': 'C',
        'shooterTimeOnIceSinceFaceoff': 45.0,
        'shootingTeamPlayerDiff': 0,
    }
    resp = client.post('/predict', json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'prediction' in data
    assert 'probability' in data
    valid_outcomes = {'goal', 'play stopped', 'play continued in zone', 'play continued outside zone', 'generated rebound'}
    assert data['prediction'] in valid_outcomes

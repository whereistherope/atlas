from pathlib import Path
root=Path(__file__).parents[1]
db=(root/'js/db.js').read_text(); transport=(root/'js/relay-transport.js').read_text(); relay=(root/'js/relay.js').read_text(); sw=(root/'sw.js').read_text()
assert "APP_VERSION='0.12.8'" in db and 'DATA_VERSION=8' in db and "DB_VERSION=3" in db
for contract in ["DB_NAME='atlas_personal_os'","DB_STORE='state'","BACKUP_STORE='backups'","AUTH_STORE='auth'","AUTH_KEY='atlas-lock'","DB_KEY='atlas-v1'","FALLBACK_KEY='atlas_v1_fallback'"]: assert contract in db
assert "ACCESS_KEY='atlas-relay-access-v1'" in transport
assert 'fetch_atlas_relay' in transport and 'ack_atlas_relay' in transport and 'relay_inbox' not in transport
assert 'Authorization' not in transport and "headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'}" in transport
assert 'atlasprofilechange' not in transport and 'profileChanged' in transport
assert 'atlasrelaystatus' in (root/'js/widgets.js').read_text() and 'atlasrelaycontent' in (root/'js/widgets.js').read_text()
assert 'create_area' in relay and 'deleteDatabase' not in ''.join(p.read_text() for p in (root/'js').glob('*.js'))
assert 'atlas-shell-0.12.8-r1' in sw
print('v0.12.8 isolated automatic Relay contracts: PASS')

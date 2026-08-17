from pathlib import Path
import re
root=Path('.')
db=(root/'js/db.js').read_text(); cloud=(root/'js/cloud.js').read_text(); transport=(root/'js/relay-transport.js').read_text(); html=(root/'index.html').read_text(); sw=(root/'sw.js').read_text(); all_js='\n'.join(p.read_text() for p in (root/'js').glob('*.js'))
assert "APP_VERSION='0.12.7'" in db and 'DATA_VERSION=8' in db
for exact in ["DB_NAME='atlas_personal_os'","DB_VERSION=3","DB_STORE='state'","BACKUP_STORE='backups'","AUTH_STORE='auth'","DB_KEY='atlas-v1'","AUTH_KEY='atlas-lock'","FALLBACK_KEY='atlas_v1_fallback'","AUTH_FALLBACK_KEY='atlas_lock_config_v1'"]: assert exact in db, exact
order=[html.index('./js/cloud.js'),html.index('./js/relay.js'),html.index('./js/relay-transport.js'),html.index('./js/calendar.js')]; assert order==sorted(order)
assert "'./js/relay-transport.js'" in sw and 'atlas-shell-0.12.7-r1' in sw
assert 'relay_envelope_v1' in cloud and 'atlas_relay_envelope' in cloud and '.insert(row)' in cloud
assert 'RELAY_MAX_BYTES=512000' in cloud
relay_section=cloud[cloud.index("const RELAY_TYPE="):cloud.index("window.addEventListener?.('offline'")]
assert '.update(' not in relay_section and '.upsert(' not in relay_section and '.delete(' not in relay_section
assert '.order(\'created_at\',{ascending:false}).limit(limit)' in relay_section and 'limit>50' in relay_section
assert 'appendMeRelayEnvelope' in cloud and 'listMeRelayEnvelopes' in cloud and 'getMeRelayEnvelope' in cloud
assert not re.search(r'AtlasCloud\s*=.*\b(client|from|query|database|supabase)\b',cloud)
assert not re.search(r'\.ingest\s*\(',transport) and 'setInterval' not in transport and 'setTimeout' not in transport
assert "listMeRelayEnvelopes({limit:50})" in transport and 'AtlasRelayTransport' in transport
assert 'relay-cloud-check' in (root/'js/widgets.js').read_text() and 'CHECK CLOUD' in (root/'js/widgets.js').read_text()
assert 'indexedDB.deleteDatabase' not in all_js
assert not re.search(r'\bsb_secret_[A-Za-z0-9_]*',all_js,re.I)
assert not any(p.suffix.lower()=='.sql' for p in root.rglob('*'))
assert not any('function' in p.name.lower() and 'supabase' in str(p).lower() for p in root.rglob('*'))
print('v0.12.7 authenticated Relay transport static contracts: PASS')

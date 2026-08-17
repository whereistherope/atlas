"""Static compatibility contracts for v0.12.6 conservative Me restore."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]; read=lambda p:(R/p).read_text()
db,cloud,restore,index,sw,boot=(read(p) for p in ('js/db.js','js/cloud.js','js/cloud-restore.js','index.html','sw.js','js/bootstrap.js'))
assert "APP_VERSION='0.12.6'" in db and 'DATA_VERSION=8' in db
for token in ("DB_NAME='atlas_personal_os'","DB_VERSION=3","DB_STORE='state'","BACKUP_STORE='backups'","AUTH_STORE='auth'","AUTH_KEY='atlas-lock'","DB_KEY='atlas-v1'","FALLBACK_KEY='atlas_v1_fallback'"): assert token in db
assert 'indexedDB.deleteDatabase' not in db+cloud+restore and '.clear(' not in restore
assert "if(from<8)" in db and "if(from<9)" not in db
for mutation in ("from('atlas_records')",'.insert(','.update(','.upsert(','.rpc('): assert mutation not in restore
assert "latestMeBackupSnapshot" in cloud and "getMeBackupSnapshot" in cloud
export=cloud[cloud.index('window.AtlasCloud=Object.freeze'):]
assert 'validateMeBackupPayload' not in export and 'meBackupFingerprint' not in export
assert './js/cloud-restore.js' in index and './js/cloud-restore.js' in sw and 'atlas-shell-0.12.6' in sw
assert index.index('./js/cloud-backup.js') < index.index('./js/app.js') < index.index('./js/cloud-restore.js') < index.index('./js/relay.js')
for automatic in (boot,cloud[cloud.index('async function signIn'):cloud.index('async function signOut')]): assert 'latestMeBackupSnapshot' not in automatic and 'getMeBackupSnapshot' not in automatic
print('v0.12.6 static contracts: PASS')

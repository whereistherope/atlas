"""Static safety contracts for v0.12.5 append-only Me backup."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:(ROOT/p).read_text()
db,cloud,backup,index,sw,boot,config=(read(p) for p in ('js/db.js','js/cloud.js','js/cloud-backup.js','index.html','sw.js','js/bootstrap.js','js/cloud-config.js'))
assert "APP_VERSION='0.12.5'" in db and 'DATA_VERSION=8' in db
for token in ("DB_NAME='atlas_personal_os'","DB_VERSION=3","DB_STORE='state'","BACKUP_STORE='backups'","AUTH_STORE='auth'","AUTH_KEY='atlas-lock'","DB_KEY='atlas-v1'","FALLBACK_KEY='atlas_v1_fallback'"):assert token in db
combined=cloud+backup+index+config
for forbidden in ('sb_'+'secret_','service_'+'role'):assert forbidden not in combined.lower()
assert "RECORD_TYPE='backup_snapshot_v1'" in backup and "record_type:'backup_snapshot_v1'" in cloud
for forbidden in ('.update(','.upsert(','.delete('):assert forbidden not in cloud+backup
assert cloud.count('.insert(')==1 and "from('atlas_records').insert(row)" in cloud
assert 'client_updated_at:record.clientUpdatedAt' in cloud and 'toISOString()' not in cloud
assert 'Number.isSafeInteger(record?.clientUpdatedAt)' in cloud and 'backupRecordId(record.payload)' in cloud
for table in ('atlas_vaults','atlas_profiles'):assert f"from('{table}').insert" not in cloud
assert './js/cloud-backup.js' in index and './js/cloud-backup.js' in sw and 'atlas-shell-0.12.5' in sw
assert 'cdn.jsdelivr.net' not in sw
for automatic in (boot,cloud[cloud.index('async function signIn'):cloud.index('async function signOut')],cloud[cloud.index('async function testAccess'):cloud.index('async function resolveBackupTarget')]):assert 'appendMeBackupSnapshot' not in automatic and 'AtlasCloudBackup' not in automatic
assert 'indexedDB.deleteDatabase' not in combined and '.clear(' not in backup
print('v0.12.5 static contracts: PASS')

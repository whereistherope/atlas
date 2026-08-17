"""Static safety contracts for the v0.12.4 cloud foundation."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:(ROOT/p).read_text()
db,cloud,config,index,sw,widgets=(read(p) for p in ('js/db.js','js/cloud.js','js/cloud-config.js','index.html','sw.js','js/widgets.js'))
assert "APP_VERSION='0.12.7'" in db and 'DATA_VERSION=8' in db
for token in ("DB_NAME='atlas_personal_os'","DB_VERSION=3","DB_STORE='state'","BACKUP_STORE='backups'","AUTH_STORE='auth'","AUTH_KEY='atlas-lock'","DB_KEY='atlas-v1'","FALLBACK_KEY='atlas_v1_fallback'"): assert token in db
assert 'https://tqezgmpgjoibhckhnrfw.supabase.co' in config and 'sb_publishable_' in config
for forbidden in ('sb_'+'secret_', 'service_'+'role'):
    assert forbidden not in (cloud+config+index)
assert 'src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0"' in index
assert index.index('./js/db.js')<index.index('./js/auth.js')<index.index('@supabase/supabase-js@2.111.0')<index.index('./js/cloud-config.js')<index.index('./js/cloud.js')<index.index('./js/cloud-backup.js')<index.index('./js/app.js')<index.index('./js/relay.js')<index.index('./js/calendar.js')<index.index('./js/map.js')<index.index('./js/ui.js')<index.index('./js/widgets.js')<index.index('./js/bootstrap.js')
assert './js/cloud-config.js' in sw and './js/cloud.js' in sw and './js/cloud-backup.js' in sw and 'cdn.jsdelivr.net' not in sw
assert "(state.settings.activeProfile||'me')!=='me'" in widgets and 'LOCAL ONLY' in widgets and 'status.verified' in widgets
access=cloud[cloud.index('async function testAccess'):cloud.index('async function resolveBackupTarget')]
assert "eq('created_by',user.id)" in cloud and "eq('name','Atlas')" in cloud and '.limit(1)' not in access
assert "eq('profile_key','me')" in cloud and "eq('kind','person')" in cloud and "eq('owner_user_id',user.id)" in cloud
test_access=cloud[cloud.index('async function testAccess'):cloud.index('async function resolveBackupTarget')]
assert not any(x in test_access for x in ('.insert(','.update(','.delete(',"from('atlas_records')"))
assert 'load();' in read('js/bootstrap.js') and 'await window.AtlasCloud' not in read('js/bootstrap.js')
print('v0.12.4 static contracts: PASS')

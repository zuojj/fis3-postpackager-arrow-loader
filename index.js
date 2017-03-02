
/**
 * [buildResourceMap 生成资源map]
 * @param  {[type]} ret [description]
 * @return {[type]}     [description]
 */
function buildResourceMap(ret) {
    let path = require('path'),
        root = fis.project.getProjectPath(),
        ns = fis.get('namespace'),
        mapFile = ns ? (ns + '-map.json') : 'map.json',
        map = fis.file.wrap(path.join(root, mapFile)),
        res, pkg,
        resourceMap = {
            'res': {},
            'pkg': {}
        },
        scriptRegExp = /\s*<script([^>]*)>([\s\S]*?)<\/script>/ig,
        srcRegExp = /\s*src=('|")(.+?)\1/i;

    map.setContent(JSON.stringify(ret.map, null, map.optimizer ? null : 4));
    ret.pkg[map.subpath] = map;

    res = ret.map && ret.map.res;
    pkg = ret.map && ret.map.pkg;

    if (res) {
        for (let key in res) {
            if (/\.vm$/.test(key)) {
                let item = res[key],
                    uri  = item.uri,
                    syncDeps = item.deps,
                    asyncDeps = item.extras && item.extras.async,
                    moduleId;

                /* 同步依赖, 待处理 */
                if (syncDeps) {
                    filterDeps(syncDeps);
                    moduleId = res[syncDeps[0]].extras.moduleId;
                }

                /* 异步依赖生成 resourcMap */
                if (asyncDeps) {
                    filterDeps(asyncDeps);
                    moduleId = res[asyncDeps[0]].extras.moduleId;

                    let vm = ret['src'] && ret['src'][/^\//.test(key) ? key : ('/' + key)],
                        content = vm && vm['_content'] || '';

                    let replaceStr = '';
                    
                    // 获取placeholder position
                    content.replace(scriptRegExp, function(all, attrs, content) {
                        if (content && content.indexOf(moduleId) >= 0) {
                            replaceStr = all;
                        }
                        return all;
                    });

                    (function() {
                        let item;
                        if (pkg) {
                            for (let key in pkg) {
                                item = pkg[key];
                                resourceMap['pkg'][key] = {
                                    type: item.type,
                                    uri: item.uri
                                }
                            }
                        }
                    })();

                    if (replaceStr) {
                        content = content.replace(replaceStr, "<script>require.resourceMap(" + JSON.stringify(resourceMap) + ")<\/script>" + replaceStr)
                        vm && (vm['_content'] = content);
                    }
                }
            }
        }
    }

    /**
     * [filterDeps 过滤依赖项]
     * @param  {[type]} deps [description]
     * @return {[type]}      [description]
     */
    function filterDeps(deps) {
        if (!Array.isArray(deps)) return null;
        deps.forEach(function(key, index) {
            let item = res[key] || {};

            if (!(key in resourceMap)) {
                let map = resourceMap['res'][key] = {};
                ['uri', 'type', 'pkg', 'deps'].forEach(function(k, index) {
                    if (item[k]) {
                        if (k === 'deps') {
                            let _deps = filterDeps(item[k]);
                            _deps && (map[k] = _deps);
                        } else {
                            map[k] = item[k];
                        }
                    }
                });
            }
        });

        return deps;
    }
}

module.exports = buildResourceMap;
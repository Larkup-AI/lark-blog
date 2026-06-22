"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLarkupClient = useLarkupClient;
exports.LarkupProvider = LarkupProvider;
exports.usePosts = usePosts;
exports.usePost = usePost;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const LarkupContext = (0, react_1.createContext)(null);
function useLarkupClient() {
    const ctx = (0, react_1.useContext)(LarkupContext);
    if (!ctx)
        throw new Error("useLarkupClient must be used inside <LarkupProvider>");
    return ctx.client;
}
function LarkupProvider({ client, children }) {
    return ((0, jsx_runtime_1.jsx)(LarkupContext.Provider, { value: { client }, children: children }));
}
function usePosts({ preview = false, } = {}) {
    const client = useLarkupClient();
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: true,
        error: null,
    });
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        setState({ data: null, loading: true, error: null });
        client
            .getPosts({ preview })
            .then((posts) => {
            if (!cancelled)
                setState({ data: posts, loading: false, error: null });
        })
            .catch((err) => {
            if (!cancelled)
                setState({ data: null, loading: false, error: err });
        });
        return () => {
            cancelled = true;
        };
    }, [client, preview]);
    return state;
}
function usePost(slug, { preview = false } = {}) {
    const client = useLarkupClient();
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: true,
        error: null,
    });
    (0, react_1.useEffect)(() => {
        if (!slug)
            return;
        let cancelled = false;
        setState({ data: null, loading: true, error: null });
        client
            .getPostBySlug(slug, { preview })
            .then((post) => {
            if (!cancelled)
                setState({ data: post, loading: false, error: null });
        })
            .catch((err) => {
            if (!cancelled)
                setState({ data: null, loading: false, error: err });
        });
        return () => {
            cancelled = true;
        };
    }, [client, slug, preview]);
    return state;
}
//# sourceMappingURL=context.js.map
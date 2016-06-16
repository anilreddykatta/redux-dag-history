const log = require("debug")("redux-dag-history:DagGraph");
import { BranchId, StateId } from "./interfaces";
import * as Immutable from "immutable";

export default class DagGraph {
    constructor(public graph: Immutable.Map<any, any>) {
        if (!graph) {
            throw new Error("'graph' parameter must be defined");
        }
        if (!graph.getIn) {
            throw new Error("'graph' appears to not be an immutablejs instance");
        }
    }

    public get currentStateId(): StateId {
        return this.graph.getIn(["current", "state"]);
    }

    public setCurrentStateId(stateId: StateId) {
        this.graph = this.graph.setIn(["current", "state"], stateId);
        return this;
    }

    public get currentBranch(): BranchId {
        return this.graph.getIn(["current", "branch"]);
    }

    public setCurrentBranch(branchId: BranchId) {
        this.graph = this.graph.setIn(["current", "branch"], branchId);
        return this;
    }

    public latestOn(branch: BranchId): StateId {
        return this.graph.getIn(["branches", branch, "latest"]);
    }

    public committedOn(branch: BranchId): StateId {
        return this.graph.getIn(["branches", branch, "committed"]);
    }

    public setLatest(branch: BranchId, commit: StateId) {
        this.graph = this.graph.setIn(["branches", branch, "latest"], commit);
        return this;
    }

    public setCommitted(branch: BranchId, commit: StateId) {
        this.graph = this.graph.setIn(["branches", branch, "committed"], commit);
        return this;
    }

    public insertState(commit: StateId, parent: StateId, state: any) {
        const newState = Immutable.fromJS({
            state,
            parent,
            children: Immutable.List(),
        });
        this.graph = this.graph.setIn(["states", commit], newState);
        return this;
    }

    public getState(commit: StateId) {
        return this.graph.getIn(["states", commit, "state"]);
    }

    public childrenOf(commit: StateId): StateId[] {
        const children = this.graph.getIn(["states", commit, "children"]);
        return children ? children.toJS() : [];
    }

    public parentOf(commit: StateId): StateId {
        return this.graph.getIn(["states", commit, "parent"]);
    }

    public replaceState(commit: StateId, state: any) {
        this.graph = this.graph.setIn(["states", commit, "state"], state);
        return this;
    }

    public parentPath(commit: StateId): StateId[] {
        const parents: StateId[] = [];
        let current = commit;
        do {
            const parent = this.parentOf(current);
            if (parent) {
                parents.unshift(parent);
            }
            current = parent;
        } while (current);
        return parents;
    }

    public addChild(parent: StateId, child: StateId) {
        let children = this.childrenOf(parent);
        if (!children) {
            log("No children on ", parent, this.graph.toJS());
            children = [];
        }
        children.push(child);
        return this.setChildren(parent, Immutable.List(children));
    }

    public setParent(commit: StateId, parent: StateId) {
        this.graph = this.graph.setIn(["states", commit, "parent"], parent);
    }

    public setChildren(parent: StateId, children: Immutable.List<StateId>) {
        this.graph.setIn(["states", parent, "children"], children);
        return this;
    }

    public get branches(): BranchId[] {
        const branches = this.graph.get("branches");
        return Array["from"](branches.keys());
    }

    public branchesOf(commit: StateId): BranchId[] {
        if (!commit) {
            throw new Error("commit must be defined");
        }
        const children = this.childrenOf(commit);
        if (children.length === 0) {
            const branches: BranchId[] = [];
            for (let branch of this.branches) {
                if (this.latestOn(branch) === commit) {
                    branches.push(branch);
                }
            }
            return branches;
        } else {
            let result: BranchId[] = [];
            let childrenBranches = children.map(child => this.branchesOf(child));
            childrenBranches.forEach(cb => result = result.concat(...cb));
            return result;
        }
    }

    public prune(commits: StateId[]) {
        for (let commit of commits) {
            // Prune Children
            this.prune(this.childrenOf(commit));
            this.remove(commit);
        }
        return this;
    }

    private remove(commit: StateId) {
        // Remove Commit from Parent
        const parentId = this.parentOf(commit);
        if (parentId) {
            const children = this.childrenOf(parentId).filter(cid => cid !== commit);
            this.setChildren(parentId, Immutable.List(children));
        }

        // Remove Commit from Graph
        this.graph.deleteIn(["states", commit]);
    }

    public squashCurrentBranch() {
        const toSquash: StateId[] = [];
        let current = this.parentOf(this.currentStateId);
        let numBranches: number;

        if (current) {
            do {
                // If there is a single branch in the parent, it's squashable
                const branches = this.branchesOf(current);
                numBranches = current ? branches.length : 0;
                if (numBranches === 1) {
                    toSquash.push(current);
                }
                current = this.parentOf(current);
            } while (current && numBranches === 1);
        }

        if (toSquash.length > 0) {
            toSquash.forEach(c => this.remove(c));
            this.setParent(this.currentStateId, current);
        }

        return this;
    }
}

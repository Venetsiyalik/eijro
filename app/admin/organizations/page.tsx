import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { OrganizationFormDialog } from "@/components/admin/organization-form-dialog";
import { ActiveToggleButton } from "@/components/admin/active-toggle-button";
import { toggleOrganizationActive } from "@/actions/organizations";

type OrgRow = {
  id: string;
  name: string;
  shortName: string | null;
  region: string | null;
  parentId: string | null;
  isActive: boolean;
};

type OrgTreeNode = OrgRow & { children: OrgTreeNode[] };

function buildTree(rows: OrgRow[], parentId: string | null): OrgTreeNode[] {
  return rows
    .filter((r) => r.parentId === parentId)
    .map((r) => ({ ...r, children: buildTree(rows, r.id) }));
}

function OrgNode({
  node,
  depth,
  allOrgs,
}: {
  node: OrgTreeNode;
  depth: number;
  allOrgs: OrgRow[];
}) {
  return (
    <div>
      <div
        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
        style={{ marginLeft: depth * 24 }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{node.name}</span>
            {node.shortName && <span className="text-muted-foreground text-sm">({node.shortName})</span>}
            {!node.isActive && <Badge variant="secondary">Faol emas</Badge>}
          </div>
          {node.region && <div className="text-sm text-muted-foreground">{node.region}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OrganizationFormDialog mode="edit" organization={node} parentOptions={allOrgs} />
          <ActiveToggleButton id={node.id} isActive={node.isActive} toggleAction={toggleOrganizationActive} />
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} allOrgs={allOrgs} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function OrganizationsPage() {
  const orgs = await db.organization.findMany({ orderBy: { name: "asc" } });
  const tree = buildTree(orgs, null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tashkilotlar</h1>
        <OrganizationFormDialog mode="create" parentOptions={orgs} />
      </div>
      <div className="space-y-2">
        {tree.map((node) => (
          <OrgNode key={node.id} node={node} depth={0} allOrgs={orgs} />
        ))}
        {tree.length === 0 && <p className="text-muted-foreground">Tashkilotlar mavjud emas</p>}
      </div>
    </div>
  );
}

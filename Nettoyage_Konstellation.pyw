"""GUI for explicit cleanup of superseded snapshot files after copying this update.
Only exact, unchanged, preapproved files are deletable. No automatic removal.
"""
from pathlib import Path
import hashlib
import json
import tkinter as tk
from tkinter import messagebox, ttk

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / 'maintenance-cleanup.json'


def safe_candidate(rel):
    if not isinstance(rel, str) or not rel or '\\' in rel or ':' in rel:
        return None
    parts = rel.split('/')
    if any(part in ('', '.', '..') for part in parts):
        return None
    result = ROOT
    for part in parts:
        result = result / part
        if result.is_symlink():
            return None
    if not result.resolve().is_relative_to(ROOT.resolve()):
        return None
    return result


def inspect(entry):
    path = safe_candidate(entry.get('path'))
    if path is None:
        return None, 'REFUSÉ : chemin non sûr'
    if not path.exists():
        return path, 'Déjà absent (aucune action)'
    if not path.is_file():
        return path, 'REFUSÉ : pas un fichier normal'
    if path.stat().st_size > 5_000_000:
        return path, 'REFUSÉ : taille imprévue'
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != entry.get('sha256'):
        return path, 'REFUSÉ : fichier modifié (conservé)'
    return path, 'Suppression possible (hash identique)'


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Konstellation — nettoyage local contrôlé')
        self.geometry('900x390')
        self.minsize(700, 330)
        self.entries = json.loads(MANIFEST.read_text(encoding='utf-8'))['obsolete_files']
        ttk.Label(self, text='Nettoyage après migration du snapshot', font=('Segoe UI', 15, 'bold')).pack(anchor='w', padx=18, pady=(15, 4))
        ttk.Label(self, text='Aucun fichier n’est supprimé automatiquement. Seules les anciennes copies exactes et non modifiées sont admissibles.', wraplength=840).pack(anchor='w', padx=18, pady=4)
        self.tree=ttk.Treeview(self, columns=('path','status'), show='headings',selectmode='extended',height=7)
        self.tree.heading('path', text='Ancien fichier local')
        self.tree.heading('status', text='Statut')
        self.tree.column('path', width=510)
        self.tree.column('status', width=320)
        self.tree.pack(fill='both',expand=True,padx=18,pady=12)
        actions=ttk.Frame(self);actions.pack(fill='x',padx=18,pady=(0,12))
        ttk.Button(actions,text='Actualiser',command=self.refresh).pack(side='left')
        ttk.Button(actions,text='Supprimer les fichiers sélectionnés…',command=self.delete).pack(side='right')
        ttk.Label(self,text='Note : les sauvegardes .kristal-integration-backup ne sont pas concernées.',foreground='#555').pack(anchor='w',padx=18,pady=(0,8))
        self.refresh()

    def refresh(self):
        self.tree.delete(*self.tree.get_children())
        for i,e in enumerate(self.entries):
            _,status=inspect(e)
            self.tree.insert('', 'end', iid=str(i), values=(e['path'],status))

    def delete(self):
        indexes=[int(s) for s in self.tree.selection()]
        allowed=[(self.entries[i],inspect(self.entries[i])[0]) for i in indexes if inspect(self.entries[i])[1]=='Suppression possible (hash identique)']
        if not allowed:
            messagebox.showinfo('Aucune suppression','Sélectionnez un fichier éligible. Les fichiers modifiés sont protégés.')
            return
        if not messagebox.askyesno('Confirmer la suppression',f'Supprimer définitivement {len(allowed)} ancien(s) fichier(s) exact(s) ?\nLes fichiers modifiés ne seront pas touchés.',icon='warning'):
            return
        deleted=0
        for entry,_ in allowed:
            path,status=inspect(entry)  # recheck before unlink
            if status=='Suppression possible (hash identique)':
                try:
                    path.unlink()
                    deleted+=1
                except OSError as exc:
                    messagebox.showerror('Échec de suppression',str(exc))
        self.refresh()
        messagebox.showinfo('Nettoyage terminé',f'{deleted} fichier(s) supprimé(s).')


if __name__=='__main__':
    App().mainloop()

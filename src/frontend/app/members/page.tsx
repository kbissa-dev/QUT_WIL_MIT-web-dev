"use client";

import { useState, useEffect, Suspense } from "react";
import { useAppDispatch, useAppSelector } from "../lib/hooks";
import { loggedIn } from "../lib/slices/authSlice";
import { token } from "../lib/slices/tokensSlice";
import { addNotice } from "../lib/slices/toastsSlice";
import { apiMember } from "../lib/api/member";
import { IMember } from "../lib/interfaces/member";

function UnsuspendedMembersPage() {
  const [members, setMembers] = useState<IMember[]>([]);
  const [editingMember, setEditingMember] = useState<IMember | null>(null);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", date_of_birth: "" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<IMember | null>(null);
  const isLoggedIn = useAppSelector((state) => loggedIn(state));
  const accessToken = useAppSelector((state) => token(state));
  const dispatch = useAppDispatch();

  const fetchMembers = async () => {
    try {
      const response = await apiMember.getAllMembers(accessToken);
      setMembers(Array.isArray(response) ? response : []);
    } catch (error) {
      dispatch(addNotice({
        title: "Error",
        content: "Failed to fetch members",
        icon: "error"
      }));
      setMembers([]);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchMembers();
    }
  }, [isLoggedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await apiMember.updateMember(accessToken, editingMember.id, formData);
        dispatch(addNotice({
          title: "Success",
          content: "Member updated successfully"
        }));
      } else {
        await apiMember.createMember(accessToken, formData);
        dispatch(addNotice({
          title: "Success",
          content: "Member created successfully"
        }));
      }
      setFormData({ first_name: "", last_name: "", date_of_birth: "" });
      setEditingMember(null);
      fetchMembers();
    } catch (error) {
      dispatch(addNotice({
        title: "Error",
        content: "Operation failed",
        icon: "error"
      }));
    }
  };

  const handleDeleteClick = (member: IMember) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiMember.deleteMember(accessToken, id);
      dispatch(addNotice({
        title: "Success",
        content: "Member deleted successfully"
      }));
      setShowDeleteModal(false);
      setMemberToDelete(null);
      fetchMembers();
    } catch (error) {
      dispatch(addNotice({
        title: "Error",
        content: "Failed to delete member",
        icon: "error"
      }));
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage member information
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <input
                  type="text"
                  name="first_name"
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <input
                  type="text"
                  name="last_name"
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  id="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-5">
              <button
                type="submit"
                className="inline-flex justify-center rounded-md border border-transparent bg-rose-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
              >
                {editingMember ? "Update" : "Create"} Member
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date of Birth</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {Array.isArray(members) && members.map((member) => (
                    <tr key={member.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {member.first_name} {member.last_name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(member.date_of_birth).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setFormData({
                              first_name: member.first_name,
                              last_name: member.last_name,
                              date_of_birth: member.date_of_birth,
                            });
                          }}
                          className="text-rose-600 hover:text-rose-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(member)}
                          className="text-rose-600 hover:text-rose-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for delete confirmation */}
      {showDeleteModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop"
            aria-hidden="true"
          />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Confirm Delete
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete {memberToDelete?.first_name} {memberToDelete?.last_name}?
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => memberToDelete && handleDelete(memberToDelete.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense>
      <UnsuspendedMembersPage />
    </Suspense>
  );
}

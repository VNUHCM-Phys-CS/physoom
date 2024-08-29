import Image from "next/image";
import "./ListCard.scss";
import Link from "next/link";

const ListCard = ({ post }) => {
  return (
    <div className="collapse collapse-arrow bg-primary-content border-2 border-slate-300 hover:border-slate-400">
      <input type="checkbox" className="peer" />
      <div className="collapse-title glass peer-checked:bg-base-200 peer-checked:text-primary">
        <div className="text-xl font-bold">{post.title}</div>
      </div>

      <div className="collapse-content peer-checked:bg-base-200">
        <div className=" card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex gap-1 justify-end">
              <Link href={`/list/${post._id}`}>
                <button className="btn btn-secondary btn-sm">
                  Edit
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="bi bi-pencil-square"
                    viewBox="0 0 16 16"
                  >
                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                    <path
                      fillRule="evenodd"
                      d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"
                    />
                  </svg>
                </button>
              </Link>
              <button className="btn btn-secondary btn-sm">
                Play
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-play-fill"
                  viewBox="0 0 16 16"
                >
                  <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393" />
                </svg>
              </button>
            </div>
            {post.presentation.length
              ? post.presentation.map((d) => <></>)
              : "No group assigned for this!"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListCard;

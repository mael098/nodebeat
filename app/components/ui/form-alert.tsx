type FormAlertProps = {
  message: string;
};

export default function FormAlert({ message }: FormAlertProps) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
    >
      {message}
    </div>
  );
}

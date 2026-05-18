/** Input with datalist for customizable dropdown options */
const CreatableSelectInput = ({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = '',
  className = 'input-field',
}) => (
  <>
    <input
      type="text"
      id={id}
      name={name}
      list={`${id}-options`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
    <datalist id={`${id}-options`}>
      {options.map((opt) => (
        <option key={opt} value={opt} />
      ))}
    </datalist>
  </>
);

export default CreatableSelectInput;
